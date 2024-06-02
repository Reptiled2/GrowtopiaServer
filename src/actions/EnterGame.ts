import { Variant } from "growtopia.js";
import { Peer } from "../structures/Peer";
import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { ActionType } from "../types/action";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "enter_game"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string }>): void {
    const tes = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("Hello", "1794", "big")
      .addSpacer("small")
      .addTextBox("Welcome to My Server!")
      .raw("add_image_button||interface/large/news_banner1.rttex|bannerlayout|||\n")
      .addQuickExit()
      .endDialog("gazzette_end", "", "Ok")
      .str();

    peer.send(Variant.from("OnRequestWorldSelectMenu"), 
    Variant.from("OnConsoleMessage", `Welcome back ${peer.getTag()}\`\`.`),
    Variant.from("OnConsoleMessage", "Where would you like to go?"),
    Variant.from({ delay: 100 }, "OnDialogRequest", tes));

    
  }
}
