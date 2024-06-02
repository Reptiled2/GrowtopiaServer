import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types/command";
import { Role } from "../utils/Constants";
import { World } from "../structures/World";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "nuke",
      description: "Nukes the world from orbit",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/nuke <world_name?>",
      example: ["/nuke", "/nuke START"],
      alias: [],
      permission: Role.MOD.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    let world: World;
    if (args[0]) {
      world = peer.base.cache.worlds.getWorld(args[0])
    } else if (peer.data?.world !== "EXIT") {
      world = peer.base.cache.worlds.getWorld(peer.data.world);
    } else {
      return;
    }

    if (world.data.nuked) {
      world.data.nuked = false;

      peer.send(Variant.from("OnConsoleMessage", `[\`pMOD\`\`] \`0${world.worldName} \`\`is \`2not nuked\`\` now!`));
      return;
    }
    world.data.nuked = true;
    world.saveToCache();

    peer.send(Variant.from("OnConsoleMessage", `[\`pMOD\`\`] \`0${world.worldName} \`\`is \`4nuked\`\` now!`));

    peer.everyPeer(p => {
      if (p.data.world === world.worldName && !p.isMod) {
        p.leaveWorld();
      }

      p.sound("audio/bigboom.wav");
      p.send(Variant.from("OnConsoleMessage", `>> \`4${world.worldName.toUpperCase()} was nuked from orbit\`\`. It's the only way to be sure. Play nice, everybody!`));
    })
  }
}
