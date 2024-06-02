import { PeerDataType } from "../types/peer";
import { WorldData } from "../types/world";
import { find } from "../utils/Utils";
import { BaseServer } from "./BaseServer";
import { Peer } from "./Peer";
import { World } from "./World";
import { User } from "../types/database"

export class Collection<K, V> extends Map<K, V> {
  public base: BaseServer;

  constructor(base: BaseServer) {
    if (!base) throw new Error("Server are required.");
    super();

    this.base = base;
  }

  public getSelf(key: K): Peer {
    const peerData = this.get(key) as PeerDataType;
    const peer = new Peer(this.base, peerData?.netID as number);
    peer.data = peerData;

    return peer;
  }

  public setSelf(key: K, value: PeerDataType) {
    this.set(key, value as V);
  }

  public getWorld(key: K) {
    const worldData = this.get(key) as WorldData;
    const world = new World(this.base, worldData?.name as string);
    world.data = worldData;

    return world;
  }

  public setWorld(key: K, value: WorldData) {
    this.set(key, value as V);
  }

  public findPeer(func: (user: Peer) => boolean) {
    const users = this as Collection<number, PeerDataType>;

    for (const item of users.values()) {
      const peer = users.getSelf(item.netID);
      if (func(peer)) {
        return peer;
      }
    }
    return undefined;
  }

  public async getUser(userid: number) : Promise<Peer | User | undefined> {
    const user = this.findPeer((p) => Number(p.data.id_user) === userid)
    if (user) return user;

    return await this.base.database.getUserById(userid);
  }

  public filterPeer(func: (user: Peer) => boolean) {
    const arr = [];
    for (const item of this.values()) {
      if (func(item as Peer)) {
        const peerData = item as PeerDataType;
        const peer = new Peer(this.base, peerData?.netID as number);
        peer.data = peerData;

        arr.push(peer);
      }
    }
    return arr;
  }
}
