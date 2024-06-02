import { ItemDefinition, Tank, TankPacket, Variant, VariantTypes } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { Block } from "../types/world";
import { Role } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { Place } from "./Place";

export class Punch {
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

  public onPunch() {
    const tankData = this.tank.data as Tank;
    const pos = (tankData.xPunch as number) + (tankData.yPunch as number) * this.world.data.width;
    const block = this.world.data.blocks[pos];
    const itemMeta = this.base.items.metadata.items[block.fg || block.bg];

    const peerUserId = Number(this.peer.data.id_user);
    const worldOwnerId = Number(this.world.data.owner?.id);
    const worldAdmins = this.world.data?.admins

    if (!itemMeta.id) return;
    if (typeof block.damage !== "number" || (block.resetStateAt as number) <= Date.now()) block.damage = 0;
  

    if (!this.peer.isModEnabled) {
      if (itemMeta.type === ActionTypes.LOCK && block.lock?.ownerUserID !== peerUserId) {
        const adminIDs = (this.base.worldLocks.includes(itemMeta.id) ? this.world.data.admins : block.lock?.adminIDs);                                                                                                                  
      
        this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, `\`0${block.lock?.ownerName ? block.lock.ownerName : this.world.data.owner?.name}'s \`$${itemMeta.name}\`0\
 (${block.lock?.openToPublic ? "Open to public" : (adminIDs?.includes(peerUserId) ? "\`2Access Granted" : "\`4No access")}\`0)`));

        this.world.everyPeer(p => {
          p.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
        })
        return;
      }

      if (block.lock && !block.worldLock) {
        const lockBlock = this.world.data.blocks[((block.lock?.ownerX as number) + (block.lock?.ownerY as number) * this.world.data.width)];
        const lockedBlockOwner = lockBlock?.lock?.ownerUserID;
        const lockedBlockAdmins = lockBlock?.lock?.adminIDs;

        if (!lockedBlockAdmins?.includes(peerUserId) && lockedBlockOwner !== peerUserId && !lockBlock.lock?.openToPublic) {
          this.world.everyPeer(p => {
            p.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
          })
          return;
        }

      } else if (worldOwnerId) {
        if (!worldAdmins?.includes(peerUserId) && peerUserId !== worldOwnerId) {
          this.world.everyPeer(p => {
            p.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
          })
          return;
        }
      }
    }

    if (itemMeta.id === 8 || itemMeta.id === 6 || itemMeta.id === 3760 || itemMeta.id === 7372) {
      if (!this.peer.isModEnabled) {
        this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "It's too strong to break."));
        this.peer.everyPeer((p) => {
          if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") p.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
        });
        return;
      }
    }


    if (block.damage >= (this.peer.data.state.fastDig ? (itemMeta.breakHits as number) - 1 : (itemMeta.breakHits as number))) {
      this.onDestroyed(block, itemMeta, tankData);
    } else {
      this.onDamaged(block, itemMeta, tankData);
    }

    this.peer.send(this.tank);
    this.world.saveToCache();

    this.peer.everyPeer((p) => {
      if (p.data?.netID !== this.peer.data?.netID && p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
        p.send(this.tank);
      }
    });

    return;
  }

  private onDamaged(block: Block, itemMeta: ItemDefinition, tankData: Tank) {
    tankData.type = TankTypes.TILE_DAMAGE;
    tankData.info = (block.damage as number) + 5;

    block.resetStateAt = Date.now() + (itemMeta.resetStateAfter as number) * 1000;
    (block.damage as number)++;

    switch (itemMeta.type) {
      case ActionTypes.SEED:
        this.world.harvest(this.peer, block);
        break;
    }
  }

  private onDestroyed(block: Block, itemMeta: ItemDefinition, tankData: Tank) {
    if (itemMeta.type !== ActionTypes.LOCK) {
      block.damage = 0;
      block.resetStateAt = 0;

      if (block.fg) block.fg = 0;
      else if (block.bg) block.bg = 0;
    }

    tankData.type = TankTypes.TILE_PUNCH;
    tankData.info = 18;

    block.rotatedLeft = undefined;

    switch (itemMeta.type) {
      case ActionTypes.PORTAL:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        block.door = undefined;
        break;
      }

      case ActionTypes.SIGN: {
        block.sign = undefined;
        break;
      }

      case ActionTypes.DEADLY_BLOCK: {
        block.dblockID = undefined;
        break;
      }

      case ActionTypes.HEART_MONITOR: {
        block.heartMonitor = undefined;
        break;
      }

      case ActionTypes.LOCK: {
        const inventory = this.peer.data.inventory.items.find(v => v.id === itemMeta.id);
        if (inventory && inventory.amount >= itemMeta?.maxAmount) {
          this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "You don't have enough inventory space!"));

          tankData.info = 0;
          tankData.type = TankTypes.TILE_DAMAGE;
          break;
        }

        block.damage = 0;
        block.resetStateAt = 0;
        if (block.fg) block.fg = 0;
        else if (block.bg) block.bg = 0;

        if (this.base.locks.find((l) => l.id === itemMeta.id)) {
          this.world.data.blocks?.forEach((b) => {
            if (b.lock && b.lock.ownerX === block.x && b.lock.ownerY === block.y) b.lock = undefined;
          });
        } else {
          block.worldLock = undefined;
          block.lock = undefined;


          this.world.data.admins?.forEach(userid => {
            const targetPeer = this.base.cache.users.findPeer(p => p.data.id_user === userid)
            if (targetPeer) {
              targetPeer.nameChanged(targetPeer.getTag());
            }
          })

          this.world.data.admins = [];
          this.world.data.bans = [];

          const ownerId = this.world.data.owner?.id
          if (ownerId) {
            const target = this.base.cache.users.findPeer(p => p.data.id_user === ownerId)
            if (target) {
              const index = target.data.ownedWorlds.indexOf(this.world.worldName.toUpperCase())

              if (index !== -1) {
                target.data.ownedWorlds.splice(index, 1);
              }

              target.nameChanged(target.getTag());
            } else {
              (async () => {
                const user = await this.base.database.getUserById(ownerId);
                if (!user?.ownedWorlds) return;

                const ownedWorlds = JSON.parse(user?.ownedWorlds.toString());
                const index = ownedWorlds.indexOf(this.world.worldName.toUpperCase());
                if (index === -1) return;

                ownedWorlds.splice(index, 1);
                user.ownedWorlds = Buffer.from(JSON.stringify(ownedWorlds));
                this.base.database.updateUser(user);
              })()
            }
          }

          // tileUpdate(base, peer, itemMeta.type, block, world);
          this.world.everyPeer(p => {
            p.sound("audio/metal_destroy.wav");
          })

          this.world.data.owner = undefined;
          this.world.data.admins = undefined;

          Place.tileVisualUpdate(this.peer, block, 0x0, true);
        }

        this.peer.addItemInven(itemMeta?.id, 1);
        this.peer.inventory();

        this.peer.saveToCache();
        this.peer.saveToDatabase();
        break;
      }
    }
  }
}

/** Handle Punch */
