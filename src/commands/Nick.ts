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
      name: "nick",
      description: "Change your nickname",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/nick <nickname?>",
      example: ["/nick Spongebob"],
      alias: ["nickname"],
      permission: Role.MOD.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (args[0] && args[0].length <= 3) {
      peer.send(Variant.from("OnConsoleMessage", "Nickname must be longer then 3 characters."));
      return;
    }

    if (!args[0]) {
      peer.data.displayName = peer.data.tankIDName
    } else {
      peer.data.displayName = args[0];
    }

    peer.nameChanged();
    peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0Successfully changed nickname!"));
    return;
  }
}
