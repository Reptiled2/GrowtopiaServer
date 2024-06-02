import { TankPacket, TextPacket, Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { DialogReturnType } from "../types/dialog";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { DataTypes } from "../utils/enums/DataTypes";
import { TankTypes } from "../utils/enums/TankTypes";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "trash_end"
    };
  }

  public handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      trash_count: string;
      itemID: string;
    }>
  ): void {
    const itemID = parseInt(action.itemID);
    const invenItem = peer.data.inventory.items.find((item) => item.id === itemID);
    const count = parseInt(action.trash_count);

    if (!/\d/.test(action.trash_count) || count <= 0 || !invenItem) return;

    peer.removeItemInven(itemID, count);
    peer.saveToCache();
    peer.sound("audio/trash.wav");
  }
}
