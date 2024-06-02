import { Action } from "../abstracts/Action";
import { Peer } from "../structures/Peer";
import { BaseServer } from "../structures/BaseServer";
import { ActionType } from "../types/action";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "drop"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string; itemID: string }>): void {
    const itemID = parseInt(action.itemID);
    if (itemID === 18 || itemID === 32) return;

    const item = this.base.items.data.find((v) => v.itemID === itemID);
    const peerItem = peer.data?.inventory?.items.find((v) => v.id === itemID);
    
    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`Drop ${item?.name}`, item?.itemID || 0, "big")
      .addTextBox("How many to drop?")
      .addInputBox("drop_count", "", peerItem?.amount, 5)
      .embed("itemID", itemID)
      .endDialog("drop_end", "Cancel", "OK")
      .str();
    peer.send(Variant.from("OnDialogRequest", dialog));
  }
}
