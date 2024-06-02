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
      name: "home",
      description: "Go to your home world.",
      cooldown: 60,
      ratelimit: 5,
      category: "Basic",
      usage: "/home",
      example: ["/home"],
      alias: [],
      permission: Role.BASIC.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    peer.leaveWorld(false);
    peer.data?.favorites?.home ? peer.enterWorld(peer.data?.favorites?.home.toUpperCase()) : peer.enterWorld("START"); 
  }
}
