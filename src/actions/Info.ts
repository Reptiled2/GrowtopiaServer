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
      eventName: "info"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string; itemID: string }>): void {
    const itemID = parseInt(action.itemID);

    const item = this.base.items.data.find((v) => v.itemID === itemID);
    const itemInfo = this.base.items.info.find((v) => v.id === itemID);
    
    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`About ${item?.name}`, item?.itemID || 0, "big")
      .addSpacer("small")
      .addTextBox(itemInfo?.description || "No info.")
      .addSpacer("small");

    if (item?.rarity !== 999) {
      dialog.addTextBox(`Rarity: \`0${item?.rarity}`)
      .addSpacer("small");
    }

    if (itemInfo?.recipe.type === "Splicing") {
      dialog.addTextBox(`To grow, plant a \`0${item?.name} Seed\`\`. (Or splice a \`0${itemInfo.splice[0]}\`\` with a \`0${itemInfo.splice[1]})`);
    }

    dialog.addSpacer("small");

    if (itemInfo?.properties.length !== 0 && itemInfo?.properties[0] !== "None") {
      itemInfo?.properties.forEach(element => {
        dialog.addTextBox(`\`1${element}.`);
      });

      dialog.addSpacer("small");
    }

    dialog.addQuickExit()
      .endDialog("gazzette_end", "", "Ok");

    peer.send(Variant.from("OnDialogRequest", dialog.str()));
  }
}
