export interface InventoryItems {
  id: number;
  amount: number;
}

export interface Favorites {
  savedWorlds: string[];
  home: string;
}

export interface Cooldowns {
  sb : number;
}

export interface PeerDataType {
  x?: number;
  y?: number;
  world: string;
  inventory: {
    max: number;
    items: InventoryItems[];
  };
  rotatedLeft: boolean;
  requestedName: string;
  tankIDName: string;
  netID: number;
  country: string;
  id_user: number;
  role: number;
  gems: number;
  clothing: Clothing;
  ownedWorlds: string[];
  favorites: Favorites;
  mod: boolean;
  displayName: string;
  cooldowns: Cooldowns;

  state: {
    noclip: boolean;
    doubleJump: boolean;
    isInvisible: boolean;
    noHands: boolean;
    noEyes: boolean;
    noBody: boolean;
    devilHorns: boolean;
    goldenHalo: boolean;
    isFrozen: boolean;
    isCursed: boolean;
    isDuctaped: boolean;
    haveCigar: boolean;
    isShining: boolean;
    isZombie: boolean;
    isHitByLava: boolean;
    haveHauntedShadows: boolean;
    haveGeigerRadiation: boolean;
    spotlight: boolean;
    isEgged: boolean;
    havePineappleFlag: boolean;
    haveFlyingPineapple: boolean;
    haveSuperSupporterName: boolean;
    haveSuperPineapple: boolean;

    highJump: boolean;
    speedy: boolean;
    fastDig: boolean;
    fireProof: boolean;
    slowFall: boolean;
    xpBuff: boolean;
  };
}

export interface Clothing {
  hair: number;
  shirt: number;
  pants: number;
  feet: number;
  face: number;
  hand: number;
  back: number;
  mask: number;
  necklace: number;
  ances: number;
}

export interface RawPeerData {
  id_user: number,
  name: string,
  password: string,
  role: number,
  gems?: number,
  clothing?: Clothing,
  inventory?: {
    max: number,
    items: InventoryItems[]
  },
  ownedWorlds?: Array
}
