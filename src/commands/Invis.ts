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
      name: "invis",
      description: "Toggle invisibility",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/invis",
      example: ["/invis"],
      alias: ["invisible"],
      permission: Role.MOD.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!peer.data.state.isInvisible) {
      peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0You are now invisible."));

      peer.data.mod = true
      peer.data.state.isInvisible = true;

      peer.everyPeer((p) => {
        if (p.data?.netID !== peer.data?.netID && p.data?.world === peer.data?.world && p.data?.world !== "EXIT" && !p.isMod) {                                          
          p.send(
            Variant.from("OnRemove", `netID|${peer.data?.netID}`)
          );
        }
      })

      peer.setState();
      return;
    }

    peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0You are now visible."));
    peer.data.state.isInvisible = false;

    peer.everyPeer((p) => {
      if (p.data?.netID !== peer.data?.netID && p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
        p.send(
          Variant.from({ delay: -1 }, "OnSpawn", `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.id_user}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|${peer.getTag()}\`\`\ncountry|${peer.data?.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`),
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
        p.send(Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/magic.wav"));
      }
    })

    peer.send(Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/magic.wav"));
    peer.setState();
  }
}
