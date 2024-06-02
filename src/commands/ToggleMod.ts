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
      name: "togglemod",
      description: "Toggle moderator mod",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/togglemod",
      example: ["/togglemod"],
      alias: ["mod"],
      permission: Role.MOD.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!peer.isModEnabled) {
      peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0Enabled `5MODERATOR `0mod."));
      peer.data.mod = true;
      return;
    }

    peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0Disabled `5MODERATOR `0mod."));
    peer.data.mod = false;
  }
}
