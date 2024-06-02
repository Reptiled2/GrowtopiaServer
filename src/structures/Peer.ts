import { Peer as OldPeer, TankPacket, TextPacket, Variant } from "growtopia.js";
import { PeerDataType } from "../types/peer";
import { Role, WORLD_SIZE } from "../utils/Constants";
import { DataTypes } from "../utils/enums/DataTypes";
import { TankTypes } from "../utils/enums/TankTypes";
import { BaseServer } from "./BaseServer";
import { World } from "./World";
import { CharacterState } from "../utils/enums/CharacterState";
import { ItemFlags } from "../utils/enums/ItemTypes";
import { Logger } from "./Logger";

export class Peer extends OldPeer<PeerDataType> {
  public base;

  constructor(base: BaseServer, netID: number) {
    super(base.server, netID);

    this.base = base;
    this.data.state = {
      noclip: false,
      doubleJump: false,
      isInvisible: false,
      noHands: false,
      noEyes: false,
      noBody: false,
      devilHorns: false,
      goldenHalo: false,
      isFrozen: false,
      isCursed: false,
      isDuctaped: false,
      haveCigar: false,
      isShining: false,
      isZombie: false,
      isHitByLava: false,
      haveHauntedShadows: false,
      haveGeigerRadiation: false,
      spotlight: false,
      isEgged: false,
      havePineappleFlag: false,
      haveFlyingPineapple: false,
      haveSuperSupporterName: false,
      haveSuperPineapple: false,
      highJump: false,
      speedy: false,
      fastDig: false,
      fireProof: false,
      slowFall: false,
      xpBuff: false
    }
  }

  public sendClothes() {
    this.send(
      Variant.from(
        {
          netID: this.data.netID
        },
        "OnSetClothing",
        [this.data.clothing.hair, this.data.clothing.shirt, this.data.clothing.pants],
        [this.data.clothing.feet, this.data.clothing.face, this.data.clothing.hand],
        [this.data.clothing.back, this.data.clothing.mask, this.data.clothing.necklace],
        0x8295c3ff,
        [this.data.clothing.ances, 0.0, 0.0]
      )
    );

    this.everyPeer((p) => {
      if (p.data?.world === this.data.world && p.data?.netID !== this.data.netID && p.data?.world !== "EXIT") {
        p.send(
          Variant.from(
            {
              netID: this.data.netID
            },
            "OnSetClothing",
            [this.data.clothing.hair, this.data.clothing.shirt, this.data.clothing.pants],
            [this.data.clothing.feet, this.data.clothing.face, this.data.clothing.hand],
            [this.data.clothing.back, this.data.clothing.mask, this.data.clothing.necklace],
            0x8295c3ff,
            [this.data.clothing.ances, 0.0, 0.0]
          )
        );
      }
    });
  }

  /** Extended version of setDataToCache */
  public saveToCache() {
    this.base.cache.users.setSelf(this.data.netID, this.data);
    return;
  }

  public getTag(world: World | undefined = undefined) {
    switch (this.data.role) {
      case Role.OWNER.id:
        return Role.OWNER.prefix + this.data.displayName;
      
      case Role.DEVELOPER.id:
        return Role.DEVELOPER.prefix + this.data.displayName;
      
      case Role.ADMIN.id:
        return Role.ADMIN.prefix + this.data.displayName;
      
      case Role.MOD.id:
        return Role.MOD.prefix + this.data.displayName;

      case Role.SUPPORTER.id:
        return Role.SUPPORTER.prefix + this.data.displayName;

      default:
        if (world?.isWorldOwner(this)) {
          return `\`2${this.data.displayName}`
        }
        if (world?.isWorldAdmin(this)) {
          return `\`^${this.data.displayName}`
        }

        return `\`0${this.data.displayName}`;
    }
  }

  public nameChanged(name = "") {
    if (!this.data.world || this.data.world === "EXIT") return;

    if (!name || name.length === 0) {
      const world = this.base.cache.worlds.getWorld(this.data.world);
      name = this.getTag(world);
    }

    const world = this.base.cache.worlds.getWorld(this.data.world);
    world.everyPeer((p) => {
      p.send(Variant.from({ netID: this.data.netID }, "OnNameChanged", name));
    })
  }

  public checkState() {
    const states = {} as PeerDataType["state"];
    for (const [_, id] of Object.entries(this.data.clothing)) {
      const item = this.base.items.data.find((object => object.itemID === id))

      if (item?.mods) {
        Object.values(ItemFlags).filter(key => !Number.isNaN(Number(key))).forEach(mod => {
          if ((item.mods & (1 << (mod as number))) !== 0) {
            switch (mod) {
              case ItemFlags.doubleJump:
                states.doubleJump = true
                break;
                
              case ItemFlags.fastDig:
                states.fastDig = true;
                break;

              case ItemFlags.fireProof:
                states.fireProof = true;
                break;

              case ItemFlags.highJump:
                states.highJump = true;
                break;

              case ItemFlags.slowFall:
                states.slowFall = true;
                break;

              case ItemFlags.speedy:
                states.speedy = true;
                break;

              case ItemFlags.xpBuff:
                states.xpBuff = true;
                break;

            }
          }
        })
      }
    }
    
    if (this?.isDev) {
      states.haveSuperSupporterName = true;
    } 
    if (this.data?.state?.isInvisible) {
      states.isInvisible = true;
    }
    if (this.data?.state?.isDuctaped) {
      states.isDuctaped = true;
    }

   return states
  }

  public getState(states?: PeerDataType["state"]) {
    if (!states || states === undefined) states = this.data.state 

    let state = 0
    for (const [key, value] of Object.entries(CharacterState)) {
      if (states[key as keyof typeof states]) {
        state |= value as number;
      }
    };

    const tank = TankPacket.from({
      type: 0x14,
      netID: this.data.netID,
      info: state, 
      xPos: 1200,
      yPos: 100,
      xSpeed: 300,
      ySpeed: 600,
      xPunch: 0,
      yPunch: 0,
      state: 0
    }).parse() as Buffer;

    tank.writeUint8(0x0, 5);
    tank.writeUint8(0x80, 6);
    tank.writeUint8(0x80, 7);

    return tank
  }

  public setState(tank?: Buffer) {
    if (!tank) tank = this.getState();

    this.everyPeer((peer) => {
      if (peer.data.world.toUpperCase() === this.data.world.toUpperCase()) {
        peer.send(tank);
      }
    })
  }

  public isWearing(itemID: number) {
    return Object.keys(this.data.clothing).find(
      v => this.data.clothing[v as keyof typeof this.data.clothing] === itemID) 
  }

  /** Extended version of setDataToDatabase */
  public async saveToDatabase() {
    return await this.base.database.saveUser(this.data);
  }

  public getSelfCache() {
    return this.base.cache.users.getSelf(this.data.netID);
  }
  public sound(file: string, delay = 100) {
    this.send(TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|${file}`, `delayMS|${delay}`));
  }

  public leaveWorld(sendMenu = true) {
    if (!this.data.world) return;

    const world = this.hasWorld(this.data.world);
    world?.leave(this, sendMenu);
  }

  public get name(): string {
    if (this.data.role >= Role.MOD.id) return `@${this.data.tankIDName}`;
    return this.data.tankIDName;
  }

  public get isDev(): boolean {
    return Number(this.data.role) >= Role.DEVELOPER.id;
  }

  public get isAdmin(): boolean {
    return Number(this.data.role) >= Role.ADMIN.id;
  }

  public get isMod(): boolean {
    return Number(this.data.role) >= Role.MOD.id;
  }

  public get isSupporter(): boolean {
    return Number(this.data.role) >= Role.SUPPORTER.id;
  }

  public get isModEnabled(): boolean {
    return this.data.mod;
  }

  public everyPeer(callbackfn: (peer: Peer, netID: number) => void): void {
    this.base.cache.users.forEach((p, k) => {
      const pp = this.base.cache.users.getSelf(p.netID);
      callbackfn(pp, k);
    });
  }

  public hasWorld(worldName: string) {
    if (!worldName || worldName === "EXIT") return undefined;
    if (this.base.cache.worlds.has(worldName)) {
      return this.base.cache.worlds.getWorld(worldName);
    }

    const world = new World(this.base, worldName);
    return world;
  }

  public respawn(delay = 0) {
    const world = this.hasWorld(this.data.world);
    const mainDoor = world?.data.blocks?.find((block) => block.fg === 6);

    this.send(
      Variant.from({ netID: this.data.netID, delay: delay }, "OnSetFreezeState", 1),
      Variant.from({ netID: this.data.netID, delay: delay }, "OnKilled"),
      Variant.from({ netID: this.data.netID, delay: 2000 + delay }, "OnSetPos", [(mainDoor?.x || 0 % WORLD_SIZE.WIDTH) * 32, (mainDoor?.y || 0 % WORLD_SIZE.WIDTH) * 32]),
      Variant.from({ netID: this.data.netID, delay: 2000 + delay }, "OnSetFreezeState", 0)
    );

    this.sound("audio/teleport.wav", 2000 + delay);
  }

  public enterWorld(worldName: string, x?: number, y?: number, summon = false) {
    const world = this.hasWorld(worldName);
    const mainDoor = world?.data.blocks?.find((block) => block.fg === 6);

    world?.enter(this, { x: x ? x : mainDoor?.x, y: y ? y : mainDoor?.y }, summon);
    this.inventory();
  }

  public drop(id: number, amount: number) {
    if (this.data.world === "EXIT") return;

    const world = this.hasWorld(this.data.world);
    // world.getFromCache();

    const extra = Math.random() * 6;

    const x = (this.data.x as number) + (this.data.rotatedLeft ? -25 : +25) + extra;
    const y = (this.data.y as number) + extra - Math.floor(Math.random() * (3 - -1) + -3);

    world?.drop(this, x, y, id, amount);
  }

  public addItemInven(id: number, amount = 1) {
    const item = this.data.inventory.items.find((i) => i.id === id);

    if (!item) this.data.inventory.items.push({ id, amount });
    else if (item.amount < 200) item.amount += (item.amount + amount < 200 ? amount : 200 - item.amount);

    // this.inventory();
    this.saveToCache();
  }

  public removeItemInven(id: number, amount = 1) {
    const item = this.data.inventory.items.find((i) => i.id === id);

    if (item) {
      item.amount -= amount;
      if (item.amount < 1) {
        this.data.inventory.items = this.data.inventory.items.filter((i) => i.id !== id);

        const bodyPart = this.isWearing(id);
        if (bodyPart) {
          this.data.clothing[bodyPart as keyof typeof this.data.clothing]= 0;
          this.sendClothes();
        }
      }
    }

    this.inventory();
    this.saveToCache();
  }

  public inventory() {
    const inventory = this.data.inventory;

    this.send(
      TankPacket.from({
        type: TankTypes.PEER_INVENTORY,
        data: () => {
          const buffer = Buffer.alloc(7 + inventory.items.length * 4);

          buffer.writeUInt8(0x1); // type?
          buffer.writeUInt32LE(inventory.max, 1);
          buffer.writeUInt16LE(inventory.items.length, 5);

          let offset = 7;

          inventory.items.forEach((item) => {
            if (item.amount > 200) item.amount = 200

            buffer.writeUInt16LE(item.id, offset);

            if (Object.values(this.data.clothing || []).includes(item.id)) {
              buffer.writeUInt16LE(item.amount | (1 << 8), offset + 2); // use bitwise OR (1 << 8) if item is equipped. could be wrong
            } else {
              buffer.writeUInt16LE(item.amount, offset + 2);
            };

            offset += 4;
          });
          return buffer;
        }
      },
    )
  )};

  public sendEffect(x: number, y: number, size: number, id: number, delay = 0) {
    const tank = TankPacket.from({
      packetType: TankTypes.EFFECT,
      xPos: x,
      yPos: y,
      ySpeed: id,
      xSpeed: size,
    });
  }
}
