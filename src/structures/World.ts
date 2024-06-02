import { Tank, TankPacket, TextPacket, Variant } from "growtopia.js";
import { PeerDataType } from "../types/peer";
import { Flags } from "../utils/enums/Tiles";
import { Block, EnterArg, Place, WorldData } from "../types/world";
import { BaseServer } from "./BaseServer";
import { Role, WORLD_SIZE, Y_END_DIRT, Y_LAVA_START, Y_START_DIRT } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { Peer } from "./Peer";
import { DataTypes } from "../utils/enums/DataTypes";
import { Tile } from "./Tile";

export class World {
  public data: WorldData = {
    name: "",
    width: 0,
    height: 0,
    blockCount: 0,
    blocks: [],
    kickCooldown: 0
  };
  public worldName;

  constructor(
    private base: BaseServer,
    worldName: string
  ) {
    this.base = base;
    this.worldName = worldName;
  }

  public saveToCache() {
    this.base.cache.worlds.setWorld(this.worldName, this.data);
    return;
  }

  public getWorldCache(worldName: string) {
    return this.base.cache.worlds.getWorld(worldName);
  }

  public async saveToDatabase() {
    const wrld = this.getWorldCache(this.worldName);
    const world = await this.base.database.getWorld(this.worldName);
    if (world) {
      await this.base.database.updateWorld({
        name: wrld.worldName,
        ownedBy: wrld.data.owner ? `${wrld.data.owner.id}` : null,
        blockCount: wrld.data.blockCount,
        width: wrld.data.width,
        height: wrld.data.height,
        blocks: Buffer.from(JSON.stringify(wrld.data.blocks)),
        owner: wrld.data.owner ? Buffer.from(JSON.stringify(wrld.data.owner)) : null,
        dropped: Buffer.from(JSON.stringify(wrld.data.dropped)),
        admins: wrld.data.admins ? Buffer.from(JSON.stringify(wrld.data.admins)) : null,
        nuked: wrld.data?.nuked ? wrld.data?.nuked : false,
        bans: wrld.data?.bans ? Buffer.from(JSON.stringify(wrld.data.bans)) : null
      });
    } else {
      await this.base.database.saveWorld({
        name: wrld.data.name,
        ownedBy: wrld.data.owner ? `${wrld.data.owner.id}` : null,
        blockCount: wrld.data.blockCount,
        width: wrld.data.width,
        height: wrld.data.height,
        blocks: Buffer.from(JSON.stringify(wrld?.data.blocks)),
        owner: wrld.data.owner ? Buffer.from(JSON.stringify(wrld.data.owner)) : null,
        dropped: Buffer.from(JSON.stringify(wrld.data.dropped)),
        admins: wrld.data.admins ? Buffer.from(JSON.stringify(wrld.data.admins)) : null,
        nuked: wrld.data.nuked ? wrld.data.nuked : false,
        bans: wrld.data?.bans ? Buffer.from(JSON.stringify(wrld.data.bans)) : null
      });
    }
  }

  public place({ peer, x, y, isBg, id, fruit }: Place) {
    let state = 0x8;

    const block = this.data.blocks[x + y * this.data.width];
    block[isBg ? "bg" : "fg"] = id;

    if (peer.data?.rotatedLeft) {
      state |= 0x10;
      block.rotatedLeft = true;
    }

    peer.everyPeer((p) => {
      if (p.data?.world === this.data.name && p.data?.world !== "EXIT") {
        const packet = TankPacket.from({
          type: TankTypes.PEER_DROP,
          netID: peer.data?.netID,
          state,
          info: id,
          xPunch: x,
          yPunch: y
        });

        const buffer = packet.parse() as Buffer;

        buffer[7] = fruit || 0;
        p.send(buffer);
      }
    });
  }

  public leave(peer: Peer, sendMenu = true, notify = true) {
    this.data.playerCount ? this.data.playerCount-- : 0;

    peer.send(TextPacket.from(DataTypes.ACTION, "action|play_sfx", "file|audio/door_shut.wav", "delayMS|0"));

    if (notify) {
      peer.everyPeer((p) => {
        if (p.data?.netID !== peer.data?.netID && p.data?.world !== "EXIT" && p.data?.world === peer.data?.world && (!peer.data.state.isInvisible || p.isMod))
          p.send(
            Variant.from("OnRemove", `netID|${peer.data?.netID}`),
            Variant.from("OnConsoleMessage", `\`5<${peer.getTag(this)}\`\` left, \`w${this.data.playerCount}\`\` others here\`5>\`\``),
            Variant.from("OnTalkBubble", peer.data.netID, `\`5<${peer.getTag(this)}\`\` left, \`w${this.data.playerCount}\`\` others here\`5>\`\``),
            TextPacket.from(DataTypes.ACTION, "action|play_sfx", "file|audio/door_shut.wav", "delayMS|0")
          );
      });
    }
    
    if (sendMenu) peer.send(Variant.from({ delay: 500 }, "OnRequestWorldSelectMenu"), Variant.from({ delay: 500 }, "OnConsoleMessage", "Where do you want to go?"));

    peer.data.world = "EXIT";
    this.saveToCache();
    peer.saveToCache();
    // this.saveToDatabase();
    // peer.saveToDatabase();
    if ((this.data.playerCount as number) < 1) {
      // TODO: delete the cache (if needed) & save it to db
    }
  }

  public everyPeer(callbackfn: (peer: Peer, netID: number) => void): void {
    this.base.cache.users.forEach((p, k) => {
      if (p.world !== this.worldName) return;
      
      const pp = this.base.cache.users.getSelf(p.netID);
      callbackfn(pp, k);
    });
  }

  public async getData() {
    if (!this.base.cache.worlds.has(this.worldName)) {
      const world = await this.base.database.getWorld(this.worldName);
      if (world) {
        this.data = {
          name: world.name,
          width: world.width,
          height: world.height,
          blockCount: world.blockCount,
          blocks: JSON.parse(world.blocks.toString()),
          admins: world.admins ? JSON.parse(world.admins.toString()) : [],
          playerCount: 0,
          jammers: [],
          dropped: world.dropped,
          owner: world.owner ? JSON.parse(world.owner.toString()) : null,
          nuked: world.nuked ? true : false,
          bans: world.bans ? JSON.parse(world.bans.toString()) : [],
          kickCooldown: 0
        };
      } else {
        this.generate(true);
      }
    } else this.data = this.base.cache.worlds.get(this.worldName) as WorldData;
  }

  public async enter(peer: Peer, { x, y }: EnterArg, summon: boolean) {
    // this.data = peer.hasWorld(this.worldName).data;
    // console.log(this.base.cache.worlds.get(worldName));
    await this.getData();

    if (this.data.nuked && !summon) {
      if (!peer.isMod) {
        peer.send(
          Variant.from("OnConsoleMessage", "This world is inaccessible."), 
          Variant.from("OnFailedToEnterWorld", 1)
        );
        return;
      }
      peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0Entering nuked world."));
    }

    const userBan = this.data.bans?.find(v => v.id === peer.data.id_user);
    if (userBan && this.data?.owner?.id !== peer.data.id_user) {
      if (userBan.time + 600000 - Date.now() > 0 && !summon) {
        if (!peer.isMod) {
          peer.send(
            Variant.from("OnConsoleMessage", `You are \`4banned \`\`from \`0${this.worldName.toUpperCase()}.`), 
            Variant.from("OnFailedToEnterWorld", 1)
          );
          return;
        }
        peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0Bypassing world ban."));
      }
      if (!summon) this.data.bans?.splice(this.data.bans?.indexOf(userBan), 1);
    }

    peer.sound("audio/door_open.wav");

    if (typeof x !== "number") x = -1;
    if (typeof y !== "number") y = -1;

    const tank = TankPacket.from({
      type: TankTypes.PEER_WORLD,
      state: 8,
      data: () => {
        const HEADER_LENGTH = this.worldName.length + 20;
        const buffer = Buffer.alloc(HEADER_LENGTH);

        // World data
        buffer.writeUint16LE(0x14);
        buffer.writeUint32LE(0x40, 2);
        buffer.writeUint16LE(this.worldName.length, 6);
        buffer.write(this.worldName, 8);
        buffer.writeUint32LE(this.data.width, 8 + this.worldName.length);
        buffer.writeUint32LE(this.data.height, 12 + this.worldName.length);
        buffer.writeUint32LE(this.data.blockCount, 16 + this.worldName.length);

        // Tambahan 5 bytes, gatau ini apaan
        const unk1 = Buffer.alloc(5);

        // Block data
        const blockBytes: number[] = [];
        this.data.blocks?.forEach((block) => {
          const item = this.base.items.metadata.items.find((i) => i.id === block.fg);

          const blockBuf = new Tile(this.base, this, block).serialize(item?.type as number);

          blockBuf.forEach((b) => blockBytes.push(b));
        });

        // Tambahan 12 bytes, gatau ini apaan
        const unk2 = Buffer.alloc(12);

        // Drop data
        const dropData = Buffer.alloc(8 + (this.data.dropped?.items.length as number) * 16);
        dropData.writeUInt32LE(this.data.dropped?.items.length as number);
        dropData.writeUInt32LE(this.data.dropped?.uid as number, 4);

        let pos = 8;
        this.data.dropped?.items.forEach((item) => {
          dropData.writeUInt16LE(item.id, pos);
          dropData.writeFloatLE(item.x, pos + 2);
          dropData.writeFloatLE(item.y, pos + 6);
          dropData.writeUInt8(item.amount < -1 ? 0 : item.amount, pos + 10);
          // ignore flags / 0x0
          dropData.writeUInt32LE(item.uid, pos + 12);

          pos += 16;
        });

        // Weather
        const weatherData = Buffer.alloc(12);
        weatherData.writeUint16LE(0); // weather id
        weatherData.writeUint16LE(0x1, 2); // on atau off (mungkin)
        weatherData.writeUint32LE(0x0, 4); // ??
        weatherData.writeUint32LE(0x0, 8); // ??

        return Buffer.concat([buffer, Buffer.concat([unk1, Buffer.from(blockBytes)]), Buffer.concat([unk2, dropData, weatherData])]);
      }
    });

    const mainDoor = this.data.blocks.find((block) => block.fg === 6);

    const xPos = (x < 0 ? mainDoor?.x || 0 : x) * 32;
    const yPos = (y < 0 ? mainDoor?.y || 0 : y) * 32;

    peer.send(tank);
    peer.data.x = xPos;
    peer.data.y = yPos;
    peer.data.world = this.worldName;

    peer.send(
      Variant.from({ delay: -1 }, "OnSpawn", `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.id_user}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|${peer.getTag(this)}\`\`\ncountry|${peer.data?.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\ntype|local`),

      Variant.from(
        {
          netID: peer.data?.netID
        },
        "OnSetClothing",
        [peer.data.clothing.hair, peer.data.clothing.shirt, peer.data.clothing.pants],
        [peer.data.clothing.feet, peer.data.clothing.face, peer.data.clothing.hand],
        [peer.data.clothing.back, peer.data.clothing.mask, peer.data.clothing.necklace],
        0x8295c3ff,
        [peer.data.clothing.ances, 0.0, 0.0]
      )
    );

    peer.send(Variant.from("OnConsoleMessage", `World \`0${this.worldName} \`\`entered. There are \`0${this.data.playerCount} \`\`other people here.`))
    if (this.data.owner) {
      peer.send(Variant.from("OnConsoleMessage", `\`5[\`\`\`0${this.worldName}\`\` \`$World Locked \`\`by ${this.data.owner.name}${
        this.data.admins?.includes(peer?.data?.id_user as number) || this.data.owner.id === peer.data.id_user ? " (`2ACCESS GRANTED\`\`)" : ""          
        }\`5]`));
    }

    peer.everyPeer((p) => {
      if (p.data?.netID !== peer.data?.netID && p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
        if (!peer.data.state.isInvisible) {
          p.send(
            Variant.from({ delay: -1 }, "OnSpawn", `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.id_user}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|${peer.getTag(this)}\`\`\ncountry|${peer.data?.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`),
            Variant.from(
              {
                netID: peer.data?.netID
              },
              "OnSetClothing",
              [peer.data.clothing.hair, peer.data.clothing.shirt, peer.data.clothing.pants],
              [peer.data.clothing.feet, peer.data.clothing.face, peer.data.clothing.hand],
              [peer.data.clothing.back, peer.data.clothing.mask, peer.data.clothing.necklace],
              0x8295c3ff,
              [peer.data.clothing.ances, 0.0, 0.0]
            ),
            Variant.from("OnConsoleMessage", `\`5<${peer.getTag(this)}\`\` joined, \`w${this.data.playerCount}\`\` others here\`5>\`\``),
            Variant.from("OnTalkBubble", peer.data.netID, `\`5<${peer.getTag(this)}\`\` joined, \`w${this.data.playerCount}\`\` others here\`5>\`\``),
            TextPacket.from(DataTypes.ACTION, "action|play_sfx", "file|audio/door_open.wav", "delayMS|0"),
          );
        }

        if (!p.data.state.isInvisible) {
          peer.send(
            Variant.from({ delay: -1 }, "OnSpawn", `spawn|avatar\nnetID|${p.data?.netID}\nuserID|${p.data?.id_user}\ncolrect|0|0|20|30\nposXY|${p.data?.x}|${p.data?.y}\nname|${p.getTag()}\`\`\ncountry|${p.data?.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`),
            Variant.from(
              {
                netID: p.data?.netID
              },
              "OnSetClothing",
              [p.data.clothing.hair, p.data.clothing.shirt, p.data.clothing.pants],
              [p.data.clothing.feet, p.data.clothing.face, p.data.clothing.hand],
              [p.data.clothing.back, p.data.clothing.mask, p.data.clothing.necklace],
              0x8295c3ff,
              [p.data.clothing.ances, 0.0, 0.0]
            ),
            p.getState()
          );
        }
      }
    });
    if (!peer?.data?.state?.isInvisible) this.data.playerCount ? this.data.playerCount++ : 0;

    peer.setState();
    this.saveToCache();
    peer.saveToCache();
  }

  public generate(cache?: boolean) {
    if (!this.worldName) throw new Error("World name required.");
    const width = WORLD_SIZE.WIDTH;
    const height = WORLD_SIZE.HEIGHT;
    const blockCount = height * width;

    const data: WorldData = {
      name: this.worldName,
      width,
      height,
      blockCount,
      blocks: [],
      admins: [], // separate to different table
      playerCount: 0,
      jammers: [], // separate to different table
      dropped: {
        // separate (maybe?) to different table
        uid: 0,
        items: []
      },
      nuked: false,
      bans: [],
      kickCooldown: 0
    };

    // starting points
    let x = 0;
    let y = 0;
    // main door location
    const mainDoorPosition = Math.floor(Math.random() * width);

    for (let i = 0; i < blockCount; i++) {
      // increase y axis, reset back to 0
      if (x >= width) {
        y++;
        x = 0;
      }

      const block: Block = {
        x,
        y,
        fg: 0,
        bg: 0
      };

      if (block.y === Y_START_DIRT - 1 && block.x === mainDoorPosition) {
        block.fg = 6;
        block.door = {
          label: "EXIT",
          destination: "EXIT"
        };
      } else if (block.y >= Y_START_DIRT) {
        block.fg = block.x === mainDoorPosition && block.y === Y_START_DIRT ? 8 : block.y < Y_END_DIRT ? (block.y >= Y_LAVA_START ? (Math.random() > 0.2 ? (Math.random() > 0.1 ? 2 : 10) : 4) : Math.random() > 0.01 ? 2 : 10) : 8;
        block.bg = 14;
      }

      data.blocks.push(block);

      x++;
    }
    this.data = data;
    if (cache) this.saveToCache();
  }

  public drop(peer: Peer, x: number, y: number, id: number, amount: number, { tree, noSimilar }: { tree?: boolean; noSimilar?: boolean } = {}) {
    const tank = TankPacket.from({
      type: TankTypes.PEER_DROP,
      netID: -1,
      targetNetID: tree ? -1 : peer.data?.netID,
      state: 0,
      info: id,
      xPos: x,
      yPos: y
    });

    const position = Math.trunc(x / 32) + Math.trunc(y / 32) * this.data.width;
    const block = this.data.blocks[position];

    const similarDrops = noSimilar ? null : this.data.dropped?.items.filter((i) => i.id === id && block.x === i.block.x && block.y === i.block.y).sort((a, b) => a.amount - b.amount);

    const similarDrop = Array.isArray(similarDrops) ? similarDrops[0] : null;

    if (similarDrop && similarDrop.amount < 200) {
      if (similarDrop.amount + amount > 200) {
        const extra = similarDrop.amount + amount - 200;

        amount = 0;
        similarDrop.amount = 200;

        this.drop(peer, x, y, id, extra, { tree: true });
      }

      (tank.data as Tank).netID = -3;
      (tank.data as Tank).targetNetID = similarDrop.uid;

      (tank.data as Tank).xPos = similarDrop.x;
      (tank.data as Tank).yPos = similarDrop.y;

      amount += similarDrop.amount;

      similarDrop.amount = amount;
    } else
      this.data.dropped?.items.push({
        id,
        amount,
        x,
        y,
        uid: ++this.data.dropped.uid,
        block: { x: block.x, y: block.y }
      });

    const buffer = tank.parse() as Buffer;
    buffer.writeFloatLE(amount, 20);

    peer.everyPeer((p) => p.data?.world === peer.data?.world && p.data?.world !== "EXIT" && p.send(buffer));

    this.saveToCache();
  }

  public collect(peer: Peer, uid: number) {
    const droppedItem = this.data.dropped?.items.find((i) => i.uid === uid);
    if (!droppedItem) return;
    const item = this.base.items.metadata.items.find((i) => i.id === droppedItem.id);

    const itemInInv = peer.data.inventory.items.find((i) => i.id === droppedItem.id);

    if ((!itemInInv && peer.data.inventory.items.length >= peer.data.inventory.max) || (itemInInv && itemInInv.amount >= 200)) return;

    peer.everyPeer(
      (p) =>
        p.data?.world === peer.data?.world &&
        p.data?.world !== "EXIT" &&
        p.send(
          TankPacket.from({
            type: TankTypes.PEER_DROP,
            netID: peer.data?.netID,
            targetNetID: -1,
            info: uid
          })
        )
    );

    if (itemInInv) {
      if (droppedItem.amount + itemInInv.amount > 200) {
        const extra = droppedItem.amount + itemInInv.amount - 200;
        peer.send(Variant.from("OnConsoleMessage", `Collected \`w${200 - itemInInv.amount} ${item?.name}`));
        itemInInv.amount = 200;

        this.drop(peer, droppedItem.x, droppedItem.y, droppedItem.id, extra, {
          noSimilar: true,
          tree: true
        });
      } else {
        if (droppedItem.id !== 112) {
          itemInInv.amount += droppedItem.amount;
          peer.send(Variant.from("OnConsoleMessage", `Collected \`w${droppedItem.amount} ${item?.name}`));
        } else {
          peer.data.gems += droppedItem.amount;
        }
      }
    } else {
      if (droppedItem.id !== 112) {
        peer.addItemInven(droppedItem.id, droppedItem.amount);
        peer.send(Variant.from("OnConsoleMessage", `Collected \`w${droppedItem.amount} ${item?.name}`));
      } else {
        peer.data.gems += droppedItem.amount;
      }
    }

    // biome-ignore lint/style/noNonNullAssertion: filter dropped items
    this.data.dropped!.items = this.data.dropped!.items.filter((i) => i.uid !== droppedItem.uid);

    peer.saveToCache();
    this.saveToCache();
  }

  public harvest(peer: Peer, block: Block) {
    if (block.tree && Date.now() >= block.tree.fullyGrownAt) {
      this.drop(peer, block.x * 32 + Math.floor(Math.random() * 16), block.y * 32 + Math.floor(Math.random() * 16), block.tree.fruit, block.tree.fruitCount, { tree: true });

      block.tree = undefined;
      block.fg = 0x0;

      peer.everyPeer(
        (p) =>
          p.data?.world === peer.data?.world &&
          p.data?.world !== "EXIT" &&
          p.send(
            TankPacket.from({
              type: TankTypes.TILE_TREE,
              netID: peer.data?.netID,
              targetNetID: -1,
              xPunch: block.x,
              yPunch: block.y
            })
          )
      );

      return true;
    }
    return false;
  }

  public isWorldAdmin(peer: Peer) {
    if (!this.data.owner) return false;
    return this.data.admins?.includes(Number(peer.data.id_user));
  }

  public isWorldOwner(peer: Peer) {
    return this.data.owner?.id === peer.data.id_user;
  }

  public add_lock_data_to_packet(block: Block, buffer: Buffer) {
    if (!block.lock) return;
    const newBuf = Buffer.alloc(buffer.length + 2);
    buffer.copy(newBuf, 0, 0, 8);

    const lockPos = (block.lock.ownerX as number) + (block.lock.ownerY as number) * this.data.width;
    const flag = newBuf.readUInt16LE(6);

    newBuf.writeUInt16LE(lockPos, 4);
    newBuf.writeUInt16LE(flag | Flags.FLAGS_LOCKED, 6);
    newBuf.writeUInt16LE(lockPos, 8);

    buffer.copy(newBuf, 10, 8);
    return newBuf;
  }
}
