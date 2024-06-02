export interface User {
  id_user: number;
  name: string;
  password: string;
  role: number;
  gems?: number;
  inventory?: Buffer;
  clothing?: Buffer;
  created_at: Date;
  ownedWorlds: Buffer;
  favorites: Buffer;
  cooldowns: Buffer;
}
