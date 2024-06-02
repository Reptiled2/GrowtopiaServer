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
      name: "deleteworld",
      description: "Find some items",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/deleteworld",
      example: ["/deleteworld"],
      alias: [],
      permission: Role.DEVELOPER.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    const world = peer.base.cache.worlds.getWorld(peer.data.world);
    if (!world) return;

    world.everyPeer((p) => {
      world.leave(p, true, false);
    });
    peer.send(Variant.from("OnConsoleMessage", `Deleted world \`0${world.worldName}!\`\``));

    peer.base.cache.worlds.delete(world.worldName);
    peer.base.database.deleteWorld(world.worldName);
  }
}
