import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types/command";
import { Role } from "../utils/Constants";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "ban",
      description: "Ban someone from the world",
      cooldown: 5,
      ratelimit: 5,
      category: "World",
      usage: "/ban <username>",
      example: ["/ban Seth", "/worldban Seth"],
      alias: ["worldban"],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0] || args[0].length < 3) {
      peer.send(Variant.from("OnConsoleMessage", "Username must be longer then 2 words."));
      return;
    }

    const world = peer.base.cache.worlds.getWorld(peer.data.world);
    if (!world) return;

    if (!world.isWorldOwner(peer) && !world.isWorldAdmin(peer) && !peer.isMod) {
      peer.send(Variant.from("OnConsoleMessage", "You can't do that."));
      return;
    }

    const targetPeer = peer.base.cache.users.findPeer((p) => p.data.world === world.worldName && p.data.tankIDName.toLowerCase().startsWith(args[0].toLowerCase()))
    if (!targetPeer || targetPeer.data.tankIDName === peer.data.tankIDName) {
      peer.send(Variant.from("OnConsoleMessage", `Unable to find someone named \`0${args[0]}\`\`!`));
      return;
    };

    const tableUser = world.data.bans?.find(v => v.id === targetPeer.data.id_user)
    if (tableUser) {
      tableUser.time = Date.now();
    } else {
      world.data.bans?.push({
        id: targetPeer.data.id_user,
        time: Date.now()
      });
    }

    world.everyPeer(p => {
      p.send(
        Variant.from("OnConsoleMessage", `${peer.getTag()}\`\` \`4world bans \`\`${targetPeer.getTag()} \`\`from \`0${world.worldName.toUpperCase()}\`\`!`),
        Variant.from({ netID: targetPeer.data?.netID }, "OnPlayPositioned", "audio/repair.wav")
      );
    });

    targetPeer.leaveWorld(true);
    world.saveToCache();
    return;
  }
}
