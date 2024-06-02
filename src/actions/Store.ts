import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { ActionType } from "../types/action";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "store"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string; location: string }>): void {
    switch (action.location) {

      default:
        this.base.shops.get("menu")?.handle(peer);
    }
  }
}
