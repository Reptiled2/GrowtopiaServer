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
      name: "uba",
      description: "Unban everyone from the world.",
      cooldown: 5,
      ratelimit: 5,
      category: "World",
      usage: "/uba",
      example: ["/uba"],
      alias: [],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    const world = peer.base.cache.worlds.getWorld(peer.data.world);
    if (!world) return;

    if (!world.isWorldOwner(peer) && !world.isWorldAdmin(peer) && !peer.isMod) {
      peer.send(Variant.from("OnConsoleMessage", "You can't do that."));
      return;
    }

    world.data.bans = [];
    world.saveToCache();

    peer.send(Variant.from("OnConsoleMessage", "Successfully unbanned everyone!"));
    return;
  }
}
