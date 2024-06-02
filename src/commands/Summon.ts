import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types/command";
import { Role } from "../utils/Constants";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "summon",
      description: "Summon someone",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/summon <username>",
      example: ["/summon Seth"],
      alias: [],
      permission: Role.MOD.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0] || args[0].length < 3) {
      peer.send(Variant.from("OnConsoleMessage", "Username must be longer then 2 words."));
      return;
    }

    const targetPeer = peer.base.cache.users.findPeer(p => p.data.tankIDName.toLowerCase().startsWith(args[0].toLowerCase()))
    if (!targetPeer) {
      peer.send(Variant.from("OnConsoleMessage", `Unable to find someone named \`0${args[0]}\`\`!`));
      return;
    }

    if (targetPeer.data.world.toUpperCase() === peer.data.world.toUpperCase()) {
      if (!peer.data.x || !peer.data.y) return;
      targetPeer.data.x = peer.data.x;
      targetPeer.data.y = peer.data.y;

       targetPeer.send(Variant.from(
        { netID: targetPeer.data.netID }, "OnSetPos", [peer.data.x, peer.data.y]
      ));

      const world = peer.base.cache.worlds.getWorld(peer.data.world);
      world.everyPeer(p => {
        p.send(
          Variant.from(
            { netID: targetPeer.data.netID }, "OnPlayPositioned", "audio/object_spawn.wav"
          )
        );
      });

      targetPeer.send(Variant.from("OnTextOverlay", "You have been `5summoned`` by a mod!"));
      peer.send(Variant.from("OnConsoleMessage", `[\`pMOD\`\`] \`0Successfully summoned ${targetPeer.name}\`0!`));
      return;
    }

    targetPeer.leaveWorld(false);
    targetPeer.enterWorld(peer.data.world, (peer.data.x ? peer.data.x / 32 : undefined), (peer.data.y ? peer.data.y / 32 : undefined), true);
    targetPeer.send(Variant.from("OnTextOverlay", "You have been `5summoned`` by a mod!"));
    targetPeer.data.world = peer.data.world;

    peer.send(Variant.from("OnConsoleMessage", `[\`pMOD\`\`] \`0Successfully summoned ${targetPeer.name}\`0!`));
  }
}
