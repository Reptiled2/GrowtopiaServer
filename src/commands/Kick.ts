import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types/command";
import { Role } from "../utils/Constants";
import { Block } from "../types/world";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "kick",
      description: "Kick someone",
      cooldown: 5,
      ratelimit: 5,
      category: "World",
      usage: "/kick <username>",
      example: ["/kick Seth"],
      alias: [],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0] || args[0].length < 3) {
      peer.send(Variant.from("OnConsoleMessage", "Username must be longer then 2 words."));
      return;
    }

    const world = peer.base.cache.worlds.getWorld(peer.data.world);
    if (!world) return;

    const targetPeer = peer.base.cache.users.filterPeer((p) => p.data.world === world.worldName && p.data.tankIDName.toLowerCase().startsWith(args[0].toLowerCase()))
    if (targetPeer?.length === 0 || !peer.data.x || !peer.data.y) {
      peer.send(Variant.from("OnConsoleMessage", `Unable to find someone named \`0${args[0]}\`\`!`));
      return;
    };

    if (targetPeer.length > 1) {
      peer.send(Variant.from("OnConsoleMessage", `There are more then 1 names starting with \`0${args[0]}\`\`!`));
      return;
    }

    if (!peer.isMod) {
      if (!world.isWorldOwner(peer) && !world.isWorldAdmin(peer)) {
        const pos = Math.round(Number(targetPeer[0].data.x) / 32) + Math.round(Number(targetPeer[0].data.y) / 32) * (world.data.width as number);
        const block = world.data.blocks[pos] as Block;

        if (block?.lock?.ownerX && block?.lock?.ownerY) {
          const lockBlock = world.data.blocks[block.lock.ownerX + block.lock.ownerY * world.data.width] as Block;

          const isAdmin = lockBlock?.lock?.adminIDs?.includes(peer.data.id_user)
          const isOwner = lockBlock?.lock?.ownerUserID === peer.data.id_user
          if (!isAdmin && !isOwner || (isAdmin && lockBlock?.lock?.ownerUserID === targetPeer[0].data.id_user)) {
            peer.send(Variant.from("OnConsoleMessage", "You can't do that."));
            return;
          }

        } else {
          peer.send(Variant.from("OnConsoleMessage", "You can't do that."));
          return;
        }
      }
  
      if ((world.isWorldOwner(targetPeer[0]) || (world.isWorldAdmin(peer) && world.isWorldAdmin(targetPeer[0])))) {
        peer.send(Variant.from("OnConsoleMessage", "You can't do that."));
        return;
      }
    }

    targetPeer[0].respawn();
    world.everyPeer(p => {
      p.send(
        Variant.from(
          { netID: targetPeer[0].data.netID }, "OnPlayPositioned", "audio/object_spawn.wav"
        ),
        Variant.from("OnConsoleMessage", `${peer.getTag(world)}\`\` \`4kicks \`\`${targetPeer[0].getTag(world)}\`\`!`)
      );
    });
    return;
    
  }
}
