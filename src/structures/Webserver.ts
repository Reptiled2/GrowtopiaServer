import express from "express";
import { readFileSync, existsSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { Logger } from "./Logger";
import bodyparser from "body-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { Database } from "../database/db";
import decompress from "decompress";
const app = express();

const options = {
  key: readFileSync("./assets/ssl/server.key"),
  cert: readFileSync("./assets/ssl/server.crt")
};

const apiLimiter = rateLimit({
  windowMs: 10800000, // 3 hour
  max: 5, // Limit each IP to 5 requests per `window`
  message: "Too many accounts created from this IP, please try again after 3 hour",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

export async function WebServer(log: Logger, db: Database) {
  if (!existsSync("./assets/cache.zip")) throw new Error("Could not find 'cache.zip' file, please get one from growtopia 'cache' folder & compress the 'cache' folder into zip file.");

  log.info("Please wait extracting cache.zip");
  await decompress("assets/cache.zip", "assets/cache");
  log.ready("Successfully extracting cache.zip");

  app.use(bodyparser.urlencoded({ extended: true }));
  app.use(bodyparser.json());

  if (existsSync("./assets/cache/cache")) {
    app.use("/growtopia/cache", express.static(path.join(__dirname, "../../../assets/cache/cache")));
  } else {
    console.log(path.join(__dirname, "../../../assets/cache"));
    app.use("/growtopia/cache", express.static(path.join(__dirname, "../../../assets/cache")));
  }

  app.use("/growtopia/server_data.php", (req, res) => {
    res.send(`server|${process.env.WEB_ADDRESS}\nport|17091\ntype|1\n#maint|Maintenance\nmeta|lolwhat\nRTENDMARKERBS1001`);
  });

  app.use((req, res, next) => {
    log.warn(`Growtopia Client requesting cache: ${req.originalUrl} not found. Redirecting to Growtopia Original CDN...`);
    res.redirect(`https://ubistatic-a.akamaihd.net/0098/8558459/${req.originalUrl.replace("/growtopia/", "")}`);
    next();
  });

  if (process.env.WEB_ENV === "production") {
    app.listen(3000, () => {
      log.ready(`Starting development web server on: http://${process.env.WEB_ADDRESS}:3000`);
      log.info(`To register account you need to register at: http://${process.env.WEB_ADDRESS}:3000/register`);
    });
  } else if (process.env.WEB_ENV === "development") {
    const httpServer = http.createServer(app);
    const httpsServer = https.createServer(options, app);

    httpServer.listen(80);
    httpsServer.listen(443);

    httpsServer.on("listening", () => {
      log.ready(`Starting web server on: http://${process.env.WEB_ADDRESS}:80`);
    });
  }
}
