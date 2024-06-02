import { Tank, TankPacket, Variant } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { Role } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { PlacedArg, Block } from "../types/world";
import { Floodfill } from "../structures/FloodFill";
import { BlockFlags } from "../utils/enums/ItemTypes";
import { Tile } from "../structures/Tile";

export class Place {
  public base: BaseServer;
  public peer: Peer;
  public tank: TankPacket;
  public world: World;

  constructor(base: BaseServer, peer: Peer, tank: TankPacket, world: World) {
    this.base = base;
    this.peer = peer;
    this.tank = tank;
    this.world = world;
  }

  public static tileUpdate(base: BaseServer, peer: Peer, actionType: number, block: Block, world: World) {
    peer.everyPeer((p) => {
      if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
        p.send(
          TankPacket.from({
            type: TankTypes.TILE_UPDATE,
            xPunch: block.x,
            yPunch: block.y,
            data: () => new Tile(base, world, block).serialize(actionType)
          })
        );
      }
    });
  }

  public tileUpdate(actionType: number, block: Block) {
    this.peer.everyPeer((p) => {
      if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
        p.send(
          TankPacket.from({
            type: TankTypes.TILE_UPDATE,
            xPunch: block.x,
            yPunch: block.y,
            data: () => new Tile(this.base, this.world, block).serialize(actionType)
          })
        );
      }
    });
  }

  public static tileVisualUpdate(peer: Peer, block: Block, visualFlags: number, everyPeer = false) {
    const tank = TankPacket.from({
      type: TankTypes.TILE_UPDATE,
      xPunch: block.x,
      yPunch: block.y,
      data: () => {
        const buf = Buffer.alloc(8);

        buf.writeUInt32LE(block.fg | (block.bg << 16));
        buf.writeUint16LE(0x0, 4);
        buf.writeUint16LE(visualFlags, 6);

        return buf;
      }
    });

    if (everyPeer) {
      peer.everyPeer((p) => {
        if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
          p.send(tank);
        }
      });
    } else {
      peer.send(tank);
    }
  }

  public tileVisualUpdate(block: Block, visualFlags: number, everyPeer = false) {
    const tank = TankPacket.from({
      type: TankTypes.TILE_UPDATE,
      xPunch: block.x,
      yPunch: block.y,
      data: () => {
        const buf = Buffer.alloc(8);

        buf.writeUInt32LE(block.fg | (block.bg << 16));
        buf.writeUint16LE(0x0, 4);
        buf.writeUint16LE(visualFlags, 6);

        return buf;
      }
    });

    if (everyPeer) {
      this.peer.everyPeer((p) => {
        if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
          p.send(tank);
        }
      });
    } else {
      this.peer.send(tank);
    }
  }

  public onPlace(): void {
    const tankData = this.tank.data as Tank;
    const pos = (tankData.xPunch as number) + (tankData.yPunch as number) * this.world.data.width;
    const block = this.world.data.blocks[pos];
    //prettier-ignore
    const isBg = this.base.items.metadata.items[tankData.info as number].type === ActionTypes.BACKGROUND || this.base.items.metadata.items[tankData.info as number].type === ActionTypes.SHEET_MUSIC;
    const placedItem = this.base.items.metadata.items.find((i) => i.id === this.tank.data?.info);
    const mLock = this.base.locks.find((l) => l.id === placedItem?.id);
    const mainLock = block.lock ? this.world.data.blocks[(block.lock.ownerX as number) + (block.lock.ownerY as number) * this.world.data.width] : null;

    const peerUserId = Number(this.peer.data.id_user);
    const worldOwnerId = this.world.data.owner?.id ? Number(this.world.data.owner?.id) : undefined;
    const worldAdmins = this.world.data?.admins

    if (!placedItem || !placedItem.id) return;
    if (tankData.info === 18 || tankData.info === 32) return;


    if (!this.peer.isModEnabled) {
      if (block.lock) {
        const lockBlock = this.world.data.blocks[((block.lock?.ownerX as number) + (block.lock?.ownerY as number) * this.world.data.width)];
        const lockedBlockOwner = lockBlock?.lock?.ownerUserID ? lockBlock?.lock?.ownerUserID : block.lock?.ownerUserID;
        const lockedBlockAdmins = lockBlock?.lock?.adminIDs ? lockBlock?.lock?.adminIDs : [];

        if (!lockedBlockAdmins?.includes(peerUserId) && lockedBlockOwner !== peerUserId) {
          this.peer.sound("audio/cant_place_tile.wav");
          return;
        }

        if (placedItem.type === ActionTypes.LOCK && lockedBlockOwner !== peerUserId) {
          this.peer.sound("audio/cant_place_tile.wav");
          return;
        }

      } else if (worldOwnerId) {
        if (worldOwnerId !== peerUserId && (worldAdmins && !worldAdmins.includes(peerUserId))) {
          this.peer.sound("audio/cant_place_tile.wav");
          return;
        }

        if (placedItem.type === ActionTypes.LOCK && worldOwnerId !== peerUserId) {
          this.peer.sound("audio/cant_place_tile.wav");
          return;
        }

        if (placedItem.type === ActionTypes.LOCK && !mLock) {
          this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "`0Only one `$World lock `0can be placed in a world, you'd have to remove the other one first.", 0, 1));
          this.peer.sound("audio/cant_place_tile.wav");
          return;
        }
      }
    }

    if (placedItem.id === 8 || placedItem.id === 6 || placedItem.id === 1000 || placedItem.id === 3760 || placedItem.id === 7372) {
      if (!this.peer.isModEnabled) {
        this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Can't place that block."), Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/cant_place_tile.wav"));
        return;
      }
    }

    if (block.fg === 2946) {
      block.dblockID = placedItem.id;
      if (placedItem.collisionType === 1) {
        this.peer.removeItemInven(this.tank.data?.info as number, 1);
        this.tileUpdate(ActionTypes.DISPLAY_BLOCK, block);
        return;
      }
      this.tileUpdate(ActionTypes.DISPLAY_BLOCK, block);
    }

    const placed = this.onPlaced({
      actionType: placedItem.type as number,
      flags: placedItem.flags as number,
      block,
      id: placedItem.id,
      isBg
    });

    if (placed) this.peer.removeItemInven(this.tank.data?.info as number, 1);

    this.peer.sound("audio/tile_created.wav");

    this.peer.saveToCache();
    this.peer.saveToDatabase();
    return;
  }

  public onPlaced(p: PlacedArg) {
    if (p.block.fg === 2946 && p.actionType !== ActionTypes.DISPLAY_BLOCK) return false;

    // prevent replace a block to others
    if (p.block.fg && p.flags & BlockFlags.WRENCHABLE) return false;
    if (p.block.fg && !p.block.bg) return false;
    if (p.block.fg && p.actionType === ActionTypes.PLATFORM) return false;

    switch (p.actionType) {
      case ActionTypes.SHEET_MUSIC:
      case ActionTypes.BEDROCK:
      case ActionTypes.LAVA:
      case ActionTypes.PLATFORM:
      case ActionTypes.FOREGROUND:
      case ActionTypes.BACKGROUND: {
        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileVisualUpdate(p.block, 0x0, true);

        return true;
      }

      case ActionTypes.PORTAL:
      case ActionTypes.GATEWAY:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        p.block.door = { label: "", destination: "", id: "", locked: false };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        return true;
      }

      case ActionTypes.SIGN: {
        p.block.sign = { label: "" };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);
        return true;
      }

      case ActionTypes.HEART_MONITOR: {
        p.block.heartMonitor = {
          name: this.peer.data.tankIDName,
          user_id: this.peer.data?.id_user
        };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      case ActionTypes.LOCK: {
        const mLock = this.base.locks.find((l) => l.id === p.id);
        if (mLock) {
          if (p.block.lock) {
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "This area is `4already locked``", 0, 1));
            return false;
          }

          if (typeof this.world.data.owner?.id === "number" && this.world.data.owner.id !== this.peer.data?.id_user) {
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "The tile owner `2allows`` public building but `4not`` for this specific block.", 0, 1));
            return false;
          }

          this.world.place({
            peer: this.peer,
            x: p.block.x,
            y: p.block.y,
            isBg: p.isBg,
            id: p.id
          });

          const algo = new Floodfill({
            s_node: { x: p.block.x, y: p.block.y },
            max: mLock.maxTiles,
            width: this.world.data.width,
            height: this.world.data.height,
            blocks: this.world.data.blocks,
            s_block: p.block,
            base: this.base,
            noEmptyAir: false
          });

          algo.exec();
          algo.apply(this.world, this.peer);
          this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Area locked.", 0, 1));

          return true;
        }
        if (this.world.data.blocks?.find((b) => b.lock?.ownerUserID && b.lock.ownerUserID !== this.peer.data?.id_user)) {
          this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, `Can't put lock, there's other locks around here.`, 0, 1));
          return false;
        }

        if (p.block.x === 0 && p.block.y === 0) {
          this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "You `4cannot`` place locks over here!", 0, 1));
          return false;
        }

        p.block.worldLock = true;
        if (!p.block.lock) {
          p.block.lock = {
            ownerUserID: this.peer.data?.id_user as number
          };
        }
        this.world.data.owner = {
          id: this.peer.data?.id_user as number,
          name: this.peer.data?.tankIDName as string,
          displayName: this.peer.data?.tankIDName as string
        };

        this.world.data.admins = [];

        this.world.data.bpm = 100;
        this.peer.nameChanged(this.peer.getTag(this.world));

        this.peer.everyPeer((pa) => {
          if (pa.data?.world === this.peer.data?.world && pa.data?.world !== "EXIT")
            pa.send(
              Variant.from("OnTalkBubble", this.peer.data.netID, `\`3[\`w${this.world.worldName} \`ohas been World Locked by ${this.peer.getTag()}\`3]`),
              Variant.from("OnConsoleMessage", `\`3[\`w${this.world.worldName} \`ohas been World Locked by ${this.peer.getTag()}\`3]`),
              Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/use_lock.wav")
            );
        });

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);

        this.peer.data.ownedWorlds.push(this.world.worldName.toUpperCase());
        this.peer.saveToCache();
        this.peer.saveToDatabase();

        return true;
      }

      case ActionTypes.DISPLAY_BLOCK: {
        p.block.dblockID = 0;

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      case ActionTypes.SEED: {
        if (p.block.fg !== 0) return false;

        const item = this.base.items.metadata.items[p.id];
        const fruitCount = Math.floor(Math.random() * 10 * (1 - (item.rarity || 0) / 1000)) + 1;
        const now = Date.now();

        p.block.tree = {
          fruit: p.id - 1,
          fruitCount: fruitCount,
          fullyGrownAt: now + (item.growTime || 0) * 1000,
          plantedAt: now
        };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          id: p.id,
          fruit: fruitCount > 4 ? 4 : fruitCount
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      default: {
        this.base.log.debug("Unknown block placing", { actionType: p.actionType, block: p.block });
        return false;
      }
    }
  }
}
