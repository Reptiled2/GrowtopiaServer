import { Peer } from "../structures/Peer";
import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";
import { ActionType } from "../types/action";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "gohomeworld"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string }>): void {
    peer.leaveWorld(false);
    peer.data?.favorites?.home ? peer.enterWorld(peer.data?.favorites?.home.toUpperCase()) : peer.enterWorld("START"); 
  }
}
