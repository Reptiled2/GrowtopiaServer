import { Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { DialogReturnType } from "../types/dialog";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "find_item_end"
    };
  }

  public handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      find_item_name: string;
      buttonClicked: string;
    }>
  ): void {
    const itemID = parseInt(action.buttonClicked);
    const itemMeta = peer.base.items.data.find(item => item.itemID === itemID);

    if (!itemMeta || itemMeta.itemID === 18 || itemMeta.itemID === 32) return;

    peer.addItemInven(itemID, 1);

    peer.send(Variant.from("OnConsoleMessage", `Added \`6${itemMeta.name} \`0(${itemMeta.itemID}) \`\`to your inventory.`));
    peer.inventory();
  }
}
