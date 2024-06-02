import { TankPacket, Variant } from "growtopia.js";
import { Block } from "../types/world";
import { TankTypes } from "../utils/enums/TankTypes";
import { BaseServer } from "./BaseServer";
import { Peer } from "./Peer";
import { World } from "./World";

const directions = [
  { x: 0, y: -1 }, // N
  { x: -1, y: 0 }, // W
  { x: 0, y: 1 }, // S
  { x: 1, y: 0 }, //E

  { x: -1, y: -1 }, //NW
  { x: -1, y: 1 }, //SW
  { x: 1, y: -1 }, // NE
  { x: 1, y: 1 } // SE
];

interface Node {
  x: number;
  y: number;
}

interface FloodFillData {
  s_node: Node;
  max: number;
  width: number;
  height: number;
  blocks: Block[];
  s_block: Block;
  base: BaseServer;
  noEmptyAir: boolean;
}

export class Floodfill {
  public totalNodes: Node[] = [];
  public count = 0;

  constructor(public data: FloodFillData) {}

  async exec() {
    if (this.data.s_block.lock) return;

    const nodes: Node[] = [];
    nodes.push(this.data.s_node);

    while (this.totalNodes.length < this.data.max) {
      const tempNodes: Node[] = [];

      for (const node of nodes) {
        const neighbours = this.neighbours(node);

        for (const neighbour of neighbours) {
          const block = this.data.blocks[neighbour.x + neighbour.y * this.data.width];

          const meta = this.data.base.items.metadata.items[block.fg || block.bg];
          if (this.totalNodes.find((n) => n.x === neighbour.x && n.y === neighbour.y) || block.lock || block.worldLock || this.data.base.ignore.blockIDsToIgnoreByLock.includes(meta.id || 0) || (this.data.noEmptyAir && (!meta.id || this.data.base.ignore.blockActionTypesToIgnore.includes(meta.type || 0)))) continue;

          tempNodes.push(neighbour);
          this.totalNodes.push(neighbour);

          if (this.totalNodes.length >= this.data.max - 1) break;
        }
      }

      if (nodes.length < 1) break;
      nodes.shift();

      for (const node of tempNodes) nodes.push(node);
    }
  }

  private neighbours(node: Node) {
    const nodes: Node[] = [];

    for (let i = 0; i < directions.length; i++) {
      const x = node.x + directions[i].x;
      const y = node.y + directions[i].y;

      if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) continue;

      const block = this.data.blocks[x + y * this.data.width];

      if (block.lock) continue;
      if (i >= directions.length / 2) {
        // corners
        if (this.data.noEmptyAir && !this.isConnectedToFaces({ x, y })) continue;
      }

      if (block) nodes.push({ x, y });
    }

    return nodes;
  }
  
  public isConnectedToFaces(node: Node) {
    let res = false;
    for (let i = 0; i < 4; i++) {
      const x = node.x + directions[i].x;
      const y = node.y + directions[i].y;

      if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) continue;

      res = !!this.totalNodes.find((i) => i.x === x && i.y === y);
      if (res) break;
    }

    return res;
  }

  public async apply(world: World, owner: Peer) {
    const buffer = Buffer.alloc(this.data.max * 2);
    let pos = 0;

    this.data.s_block.lock = {
      ownerFg: this.data.s_block.fg,
      ownerUserID: typeof owner.data?.id_user === "string" ? parseInt(owner.data.id_user) : owner.data?.id_user,
      ownerName: owner.data.tankIDName,
      ownerX: this.data.s_block.x,
      ownerY: this.data.s_block.y,
      isOwner: true,
      ignoreEmptyAir: this.data.noEmptyAir,
      adminIDs: []
    };

    let i = 0;

    for (const node of this.totalNodes) {
      if (i >= this.data.max) break;
      if (node.x === this.data.s_block.x && node.y === this.data.s_block.y) continue;

      const b_pos = node.x + node.y * this.data.width;
      const block = world.data.blocks[b_pos];

      block.lock = {
        ownerFg: this.data.s_block.fg,
        //ownerUserID: owner.data.id,
        ownerX: this.data.s_block.x,
        ownerY: this.data.s_block.y
        //adminIDs: [],
      };

      buffer.writeUInt16LE(b_pos, pos);
      pos += 2;

      i++;
    }

    world.saveToCache();

    const tank = TankPacket.from({
      type: TankTypes.TILE_APPLY_LOCK,
      netID: owner.data?.id_user as number,
      targetNetID: this.data.max,
      info: this.data.s_block.fg,
      xPunch: this.data.s_block.x,
      yPunch: this.data.s_block.y,
      data: () => buffer
    });

    owner.everyPeer((pa) => {
      if (pa.data?.world === owner.data?.world && pa.data?.world !== "EXIT") {
        pa.send(Variant.from({ netID: owner.data?.netID }, "OnPlayPositioned", "audio/use_lock.wav"), tank);
      }
    });
  }
}
