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
      name: "sb",
      description: "Set home world.",
      cooldown: 600,
      ratelimit: 5,
      category: "Basic",
      usage: "/sb <message>",
      example: ["/sb Hello!"],
      alias: [],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0] || args[0].length < 3) {
      peer.send(Variant.from("OnConsoleMessage", "Message is too short."));
      return;
    }

    if (!peer.isSupporter) {
      if (peer.data.gems < 2500) {
        peer.send(Variant.from("OnConsoleMessage", "You need 2500 gems for SB."));
        return;
      }
    
      peer.send(Variant.from("OnSetBux", Number(peer.data.gems) - 2500));
      peer.data.gems = peer.data.gems - 2500;
    }
    
    const world = peer.base.cache.worlds.getWorld(peer.data.world);
    let worldname = world ? `\`$${world.worldName}` : "`4JAMMED";

    world.data.jammers?.forEach((jammer) => {
      if (jammer.type === "signal" && jammer.enabled) {
        worldname = jammer.enabled ? "`4JAMMED" : `\`$${world.worldName}`;
      }
    })

    peer.everyPeer(p => {
      p.send(Variant.from("OnConsoleMessage", 
        `CP:0_PL:0_OID:_CT:[SB]_ \`5** from (${peer.getTag(world)}\`\`\`\`\`5) in [\`\`${worldname}\`\`\`5] ** : \`\`\`$${args[0]}\`\``
      ));
      p.sound("audio/beep.wav");
    })
  }
}
