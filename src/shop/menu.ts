import { Peer } from "../structures/Peer";
import { BaseServer } from "../structures/BaseServer";
import { Shop } from "../abstracts/Shop";
import { Dialog } from "../abstracts/Dialog";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

export default class extends Shop {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      name: "menu"
    };
  }

  public handle(peer: Peer): void {
    const dialog = new DialogBuilder()
      .raw("set_description_text|Welcome to the `2GTPS Store``! Select the item you'd like more info on.\n")
      .enableTabs("1")
      .addTabButton("menu", "Home", "interface/large/btn_shop.rttex", "1", "0")
      .addTabButton("locks", "Locks & Stuff", "interface/large/btn_shop.rttex", "0", "1")
      .addTabButton("items", "Item Packs", "interface/large/btn_shop.rttex", "0", "3")

      .addImageButton("menu", "custom/ShopBanner.rttex")                                                                                                                      
      .addBanner("interface/large/gui_shop_featured_header.rttex", "0", "1")
      
      .addShopButton("upgrade_backpack", "`0Upgrade Backpack`` (`w10 Slots``)", 
      "interface/large/store_buttons/store_buttons.rttex", 
      "Test amigo hi hru ok ty die", 
      "0", "1", 
      "5000")
      .str()

    peer.send(Variant.from("OnStoreRequest", dialog))
  }
}
