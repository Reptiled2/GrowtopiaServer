import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types/command";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { Role } from "../utils/Constants";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "help",
      description: "Shows every available commands",
      cooldown: 5,
      ratelimit: 5,
      category: "Basic",
      usage: "/help <command_name?>",
      example: ["/help", "/help ping"],
      alias: [],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (args.length > 0) {
      if (!this.base.commands.has(args[0])) return peer.send(Variant.from("OnConsoleMessage", `It seems that commands doesn't exist.`));
      const cmd = this.base.commands.get(args[0]);

      const dialog = new DialogBuilder()
        .defaultColor()
        .addLabelWithIcon(cmd?.opt.name || "", "32", "small")
        .addSpacer("small")
        .addSmallText(`Description: ${cmd?.opt.description}`)
        .addSmallText(`Cooldown: ${cmd?.opt.cooldown}`)
        .addSmallText(`Ratelimit: ${cmd?.opt.ratelimit}`)
        .addSmallText(`Permissions: ${cmd?.opt.permission ? cmd.opt.permission : "None"}`)
        .addSmallText(`Usage: ${cmd?.opt.usage}`)
        .addSmallText(`Example: ${cmd?.opt.example.join(", ")}`)
        .endDialog("help_end", "", "Ok")
        .addQuickExit();
      return peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }

    const dialog = new DialogBuilder().defaultColor().addLabelWithIcon("Help", "32", "small").addSpacer("small");

    this.base.commands.forEach((cmd, key) => {
      if (key !== cmd.opt.name) return;
      dialog.addLabelWithIcon(cmd.opt.usage, "482", "small");
    });

    dialog.endDialog("help_end", "", "Ok");
    dialog.addQuickExit();
    peer.send(Variant.from("OnDialogRequest", dialog.str()));
  }
}
