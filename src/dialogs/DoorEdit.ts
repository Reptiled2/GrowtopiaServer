import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { Place } from "../tanks/Place";
import { DialogReturnType } from "../types/dialog";
import { Block } from "../types/world";
import { World } from "../structures/World";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "door_edit"
    };
  }

  public handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      tilex: string;
      tiley: string;
      itemID: string;
      label?: string;
      target?: string;
      id?: string;
    }>
  ): void {
    const world = peer.hasWorld(peer.data.world);
    const pos = parseInt(action.tilex) + parseInt(action.tiley) * (world?.data.width as number);
    const block = world?.data.blocks[pos] as Block;
    const itemMeta = this.base.items.data.find((i) => i.itemID === parseInt(action.itemID));

    if (world?.data.owner) {
      if (world?.data.owner.id !== peer.data?.id_user) return;
    }

    block.door = {
      label: action.label || "",
      destination: action.target?.toUpperCase() || "",
      id: action.id?.toUpperCase() || ""
    };

    Place.tileUpdate(this.base, peer, itemMeta?.clothingType || 0, block, world as World);
  }
}
