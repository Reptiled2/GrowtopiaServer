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
      name: "setrank",
      description: "Change player's rank",
      cooldown: 5,
      ratelimit: 5,
      category: "Moderation",
      usage: "/setrank <user?> <rank?>",
      example: ["/setrank Hamumu Owner"],
      alias: [],
      permission: Role.OWNER.id
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0] || !(args[1])) {
      peer.send(Variant.from("OnConsoleMessage", "Missing parameters."));
      return;
    }

    const role = Object.values(Role).find(v => v.name.toLocaleLowerCase() === args[1].toLocaleLowerCase())

    if (!role) {
      peer.send(Variant.from("OnConsoleMessage", "Couldn't find role!"));
      return;
    }

    const targetPeer = peer.base.cache.users.findPeer((p) => 
      p.data.tankIDName.toLocaleLowerCase() === args[0].toLocaleLowerCase())

    if (targetPeer?.data.tankIDName === peer.data.tankIDName || 
      (Number(peer.data.role) < 255 && role.id >= Number(peer.data.role))) {
      peer.send(Variant.from("OnConsoleMessage", "You can't change your own rank!"));
      return;
    }

    if (!targetPeer) {
      peer.base.database.getUser(args[0]).then(user => {
        if (!user) {
          peer.send(Variant.from("OnConsoleMessage", "Couldn't find user!"));
          return;
        }

        user.role = Number(role.id);
        peer.base.database.updateUser(user);

        peer.send(Variant.from("OnConsoleMessage", `[\`pMOD\`\`] \`0Successfully changed \`9${user.name}\`0's role to ${role.prefix}${role.name}`));
        return;
      })
      return;
    }

    targetPeer.data.role = role.id;

    peer.send(Variant.from("OnConsoleMessage", `[\`pMOD\`\`] \`0Successfully changed \`9${targetPeer.data.tankIDName}\`0's role to ${role.prefix}${role.name}`));
    targetPeer.send(Variant.from("OnConsoleMessage", "[`4SYSTEM``] \`0Your rank has been changed!"));
    targetPeer?.saveToCache();
    targetPeer?.saveToDatabase();
    targetPeer?.disconnect();
  }
}
