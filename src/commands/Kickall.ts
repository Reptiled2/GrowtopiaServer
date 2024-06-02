import { Variant, TankPacket } from "growtopia.js";
import { TankTypes } from "../utils/enums/TankTypes";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types/command";
import { Role, WORLD_SIZE } from "../utils/Constants";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "kickall",
      description: "Kick everyone",
      cooldown: 5,
      ratelimit: 5,
      category: "World",
      usage: "/kickall",
      example: ["/kickall"],
      alias: [],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    const world = peer.base.cache.worlds.getWorld(peer.data.world);
    if (!world) return;

    if (!world.isWorldOwner(peer) && !peer.isMod) {
      peer.send(Variant.from("OnConsoleMessage", "You can't do that."));
      return;
    }

    if (world.data.kickCooldown !== 0 && (world.data.kickCooldown + 300000 - Date.now()) > 0 && !peer.isMod) {
      peer.send(Variant.from("OnConsoleMessage", "Slow down champion."));
      return;
    }

    world.data.kickCooldown = Date.now();
    peer.send(Variant.from("OnConsoleMessage", "'Tis done. You can use `5/kickall \`\`again after a minute minute cooldown period."))
    world.everyPeer(p => {
      p.send(
        Variant.from("OnConsoleMessage", `\`4OH NO! \`\`${peer.getTag()} \`\`has used \`5/kickall\`\`. Everybody will be moved to the \`0White Door \`\`in \`55 SECONDS!`),
      );
      p.sound("audio/weird_hit.wav");

      if (p.isMod || world.isWorldAdmin(p) || world.isWorldOwner(p)) return;
      p.respawn(5000);
    });
    return;
    
  }
}
