import fs from "node:fs";
import { Client } from "growtopia.js";
import { WebServer } from "./Webserver";
import { hashItemsDat } from "../utils/Utils";
import { Action } from "../abstracts/Action";
import { ItemsDat } from "growtopia.js";
import { ItemsDatMeta } from "growtopia.js";
import { Logger } from "./Logger";
import { Command } from "../abstracts/Command";
import { CooldownOptions } from "../types/command";
import { Dialog } from "../abstracts/Dialog";
import { Database } from "../database/db";
import { Collection } from "./Collection";
import { PeerDataType } from "../types/peer";
import { Ignore, Lock, WorldData } from "../types/world";
import { ActionTypes } from "../utils/enums/Tiles";
import { Items, ItemsInfo } from "../types/items";
import { Shop } from "../abstracts/Shop";

const itemsData = JSON.parse(fs.readFileSync("./assets/items.json", "utf8")).items;
const itemsInfo = JSON.parse(fs.readFileSync("./assets/items_info.json", "utf8"));

export class BaseServer {
  public server: Client;
  public items;
  public action: Map<string, Action>;
  public cache: {
    users: Collection<number, PeerDataType>;
    worlds: Collection<string, WorldData>;
  };
  public log: Logger;
  public commands: Map<string, Command>;
  public shops: Map<string, Shop>
  public cooldown: Map<string, CooldownOptions>;
  public dialogs: Map<string, Dialog>;
  public database;
  public locks: Lock[];
  public worldLocks: number[];
  public ignore: Ignore;

  constructor() {
    this.server = new Client({ https: { enable: false } });
    this.items = {
      hash: `${hashItemsDat(fs.readFileSync("./assets/dat/items.dat"))}`,
      content: fs.readFileSync("./assets/dat/items.dat"),
      metadata: {} as ItemsDatMeta,
      data: itemsData as Items[],
      info: itemsInfo as ItemsInfo[]
    };
    this.action = new Map();
    this.cache = {
      users: new Collection(this),
      worlds: new Collection(this)
    };
    this.log = new Logger();
    this.commands = new Map();
    this.cooldown = new Map();
    this.shops = new Map();
    this.dialogs = new Map();
    this.database = new Database();
    this.locks = [
      {
        id: 202, // Small Lock
        maxTiles: 10
      },
      {
        id: 204, // Big Lock
        maxTiles: 48
      },
      {
        id: 206, // Huge Lock
        maxTiles: 200
      },
      {
        id: 4994, // Builder's Lock
        maxTiles: 200
      }
    ];
    this.worldLocks = [242, 1796, 2408, 5980, 7188, 2950, 4802, 4482]
    this.ignore = {
      blockIDsToIgnoreByLock: [6, 8],
      blockActionTypesToIgnore: [ActionTypes.LOCK, ActionTypes.MAIN_DOOR]
    };
  }

  public start() {
    this.#_loadItems().then(async () => {
      this.log.ready("Items data ready!");
      await WebServer(this.log, this.database);
      this.#_loadEvents();
      this.#_loadActions();
      this.#_loadCommands();
      this.#_loadDialogs();
      this.#_loadShops();
      this.server.listen();
    });
  }

  #_loadEvents() {
    fs.readdirSync(`${__dirname}/../events`).forEach(async (event) => {
      const file = (await import(`../events/${event}`)).default;
      const initFile = new file(this);
      this.server.on(initFile.name, (...args) => initFile.run(...args));
      this.log.event(`Loaded "${initFile.name}" events`);
    });
  }

  async #_loadItems() {
    const items = await new ItemsDat(fs.readFileSync("./assets/dat/items.dat")).decode();

    this.items.metadata = items;
  }

  #_loadActions() {
    fs.readdirSync(`${__dirname}/../actions`).forEach(async (event) => {
      const file = (await import(`../actions/${event}`)).default;
      const initFile = new file(this);
      this.action.set(initFile.config.eventName, initFile);
      this.log.action(`Loaded "${initFile.config.eventName}" actions`);
    });
  }

  #_loadDialogs() {
    fs.readdirSync(`${__dirname}/../dialogs`).forEach(async (event) => {
      const file = (await import(`../dialogs/${event}`)).default;
      const initFile = new file(this);
      this.dialogs.set(initFile.config.dialogName, initFile);
      this.log.dialog(`Loaded "${initFile.config.dialogName}" dialogs`);
    });
  }

  #_loadShops() {
    fs.readdirSync(`${__dirname}/../shop`).forEach(async (shop) => {
      const file = (await import(`../shop/${shop}`)).default;
      const initFile = new file(this);
      this.shops.set(initFile.config.name, initFile);
      this.log.shop(`Loaded "${initFile.config.name}" shop`);
    });
  }

  #_loadCommands() {
    fs.readdirSync(`${__dirname}/../commands`).forEach(async (fileName) => {
      const file = (await import(`../commands/${fileName}`)).default;
      const initFile = new file(this);
      this.commands.set(initFile.opt.name, initFile);

      initFile.opt.alias?.forEach((alias: string) => {
        this.commands.set(alias, initFile);
      });

      this.log.command(`Loaded "${initFile.opt.name}" command`);
    });
  }
}
