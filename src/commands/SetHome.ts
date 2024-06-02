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
      name: "sethome",
      description: "Set home world.",
      cooldown: 60,
      ratelimit: 5,
      category: "Basic",
      usage: "/sethome",
      example: ["/sethome"],
      alias: [],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    peer.data.favorites.home = peer.data.world.toUpperCase();
    peer.saveToCache();
    peer.send(Variant.from("OnConsoleMessage", "Successfully set home world!"));
  }
}
