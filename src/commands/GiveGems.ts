import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types/command";
import { Role } from "../utils/Constants";
import { find } from "../utils/Utils";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "givegems",
      description: "Give gems to someone or self",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/givegems <gems> <to_who?>",
      example: ["/givegems 100", "/givegems 100 Hamumu"],
      alias: [],
      permission: Role.DEVELOPER.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0]) return peer.send(Variant.from("OnConsoleMessage", "Gems amount are required."));
    if (!/\d/.test(args[0])) return peer.send(Variant.from("OnConsoleMessage", "Gems amount are must be a number."));
    if (args.length > 1) {
      const targetPeer = peer.base.cache.users.findPeer(p => p.data.tankIDName.toLowerCase().startsWith(args[1].toLowerCase()))
      if (!targetPeer) return peer.send(Variant.from("OnConsoleMessage", "Make sure that player is online."));

      targetPeer.send(Variant.from("OnSetBux", parseInt(args[0])));
      targetPeer.data.gems = parseInt(args[0]);
      targetPeer.saveToCache();
      targetPeer.saveToDatabase();

      peer.send(Variant.from("OnConsoleMessage", `Sucessfully sending \`w${args[0]}\`\` gems to ${targetPeer.getTag()}`));
    } else {
      peer.send(Variant.from("OnSetBux", parseInt(args[0])));
      peer.data.gems = parseInt(args[0]);
      peer.saveToCache();
      // peer.saveToDatabase();
      peer.send(Variant.from("OnConsoleMessage", `Sucessfully received \`w${args[0]}\`\` gems.`));
    }
  }
}
