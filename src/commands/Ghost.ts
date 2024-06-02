import {  Variant } from "growtopia.js";
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
      name: "ghost",
      description: "Enables noclip",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/ghost",
      example: ["/ghost"],
      alias: ["noclip"],
      permission: Role.MOD.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (peer.data.state.noclip) {
      peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0Disabling ghost."));
      peer.data.state.noclip = false;
      peer.setState();
      return;
    }
    
    peer.data.state.noclip = true;
    peer.send(Variant.from("OnConsoleMessage", "[`pMOD``] `0Enabling ghost."));
    peer.setState();
  }
}
