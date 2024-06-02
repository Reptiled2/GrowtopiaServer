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
      name: "give",
      description: "Give yourself items",
      cooldown: 5,
      ratelimit: 5,
      category: "Basic",
      usage: "/give <itemId> <amount?>",
      example: ["/give 242 100"],
      alias: [],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0]) {
      peer.send(Variant.from("OnConsoleMessage", "Missing parameters."));
      return;
    }

    const itemMeta = peer.base.items.data.find(item => item.itemID === Number(args[0]))
    if (!itemMeta) {
      peer.send(Variant.from("OnConsoleMessage", "Couldn't find that item!"));
      return;
    }

    const amount = Number(args[1]) && Number(args[1]) <= itemMeta.maxAmount ? Number(args[1]) : 1;

    peer.addItemInven(itemMeta.itemID, amount);

    peer.send(Variant.from("OnConsoleMessage", `Added \`6${itemMeta.name}\`\` to your inventory.`));
    peer.inventory();
  }
}
