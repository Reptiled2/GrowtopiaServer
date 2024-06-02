import knex from "knex";
import { User } from "../types/database";
import { PeerDataType, RawPeerData } from "../types/peer";
import { WorldData, WorldDB } from "../types/world";
import { encrypt } from "../utils/Utils";

export class Database {
  public knex;

  constructor() {
    this.knex = knex({
      client: "better-sqlite3",
      connection: {
        filename: "./data/dev.db"
      },
      log: {
        error(m) {
          console.log(m);
        }
      },
      useNullAsDefault: true
    });
  }

  public async getUser(username: string) {
    const res = await this.knex.select("*").from<User>("users")
      .whereRaw("LOWER(name) = ?", [username.toLowerCase()]);

    if (res.length) return res[0];
    return undefined;
  }

  public async getUserById(id_user: number) {
    const res = await this.knex.select("*").from<User>("users").where({ id_user: id_user })

    if (res.length) return res[0];
    return undefined;
  }
  

  public async saveUser(data: PeerDataType) {
    if (!data.id_user) return;

    const res = await this.knex("users")
      .where({ id_user: data.id_user })
      .update(
        {
          role: Number(data.role),
          inventory: Buffer.from(JSON.stringify(data.inventory)),
          clothing: Buffer.from(JSON.stringify(data.clothing)),
          gems: data.gems,
          ownedWorlds: Buffer.from(JSON.stringify(data.ownedWorlds)),
          favorites: data.favorites ? Buffer.from(JSON.stringify(data.favorites)) : null,
          cooldowns: data.cooldowns ? Buffer.from(JSON.stringify(data.cooldowns)) : null
        },
        []
      );

    if (res.length) return true;
    return undefined;
  }

  public async updateUser(data: User) {
    if (!data.id_user) return;

    const res = await this.knex("users")
      .where({ id_user: data.id_user })
      .update(
        {
          role: Number(data?.role),
          inventory: data.inventory,
          clothing: data.clothing,
          gems: data?.gems,
          ownedWorlds: data.ownedWorlds,
          favorites: data.favorites ? Buffer.from(JSON.stringify(data.favorites)) : null,
          cooldowns: data.cooldowns ? Buffer.from(JSON.stringify(data.cooldowns)) : null
        },
        []
      );

    if (res.length) return true;
    return undefined;
  }

  public async createUser(username: string, password: string) {
    const encPass = encrypt(password);

    const res = await this.knex("users").insert({ name: username, password: encPass, role: 1 });

    if (res.length) return res[0];
    return undefined;
  }

  public async getWorld(name: string) {
    const res = await this.knex.select("*").from<WorldData>("worlds").where({ name });

    if (res.length) {
      // Parse buffer to json
      res[0].dropped = res[0].dropped ? JSON.parse(res[0].dropped.toString()) : { uid: 0, items: [] };

      return res[0];
    }
    return undefined;
  }

  public async saveWorld({ name, ownedBy = null, blockCount, blocks, width, height, owner, dropped, admins, nuked, bans }: WorldDB) {                                                                                 
    if (!name && !blockCount && !blocks && !width && !height) return;

    const res = await this.knex("worlds").insert({
      name: name,
      ownedBy: ownedBy ? ownedBy : null,
      blockCount,
      width,
      height,
      blocks,
      owner,
      dropped,
      admins,
      nuked,
      bans
    });

    if (res.length) return true;
    return undefined;
  }

  public async updateWorld({ name, ownedBy = null, blockCount, blocks, width, height, owner, dropped, admins, nuked, bans }: WorldDB) {
    if (!name && !blockCount && !blocks && !width && !height) return;

    const res = await this.knex("worlds")
      .where({ name })
      .update(
        {
          ownedBy: ownedBy ? ownedBy : null,
          blockCount,
          width,
          height,
          blocks,
          owner,
          dropped,
          admins,
          nuked,
          bans
        },
        []
      );

    if (res.length) return res[0];
    return undefined;
  }

  public async deleteWorld(name: string) {
    if (!name) return;

    await this.knex.select("*").from<WorldData>("worlds").where({ name }).delete();
  }
}

