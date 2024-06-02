import { Peer } from "../structures/Peer";
import { ShopConfig } from "../types/shop";
import { BaseServer } from "../structures/BaseServer";
import { DialogBuilder } from "../utils/builders/DialogBuilder";

export abstract class Shop {
  public base: BaseServer;
  public config: ShopConfig

  constructor(base: BaseServer) {
    this.base = base;
    this.config = {
      name: undefined
    };
  }

  public handle(peer: Peer): void {}
}
