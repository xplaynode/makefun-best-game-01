// EMBERWARD tuning: every gameplay number lives here so balancing is
// a single-file job and the rest of the code stays free of magic values.

export const ARENA = {
  width: 1280,
  height: 720,
  wall: 28,
  centerX: 640,
  centerY: 360,
};

export const PLAYER = {
  radius: 14,
  maxHealth: 100,
  accel: 2600,
  maxSpeed: 305,
  friction: 9.5,
  fireInterval: 0.16,
  boltSpeed: 760,
  boltDamage: 12,
  boltRadius: 5,
  dashSpeed: 880,
  dashTime: 0.16,
  dashCooldown: 1.6,
  dashInvuln: 0.28,
  contactInvuln: 0.55,
};

export const EMBER = {
  radius: 34,
  maxHealth: 500,
  regenPerSecond: 6,
  moteRepair: 35,
};

export const COMBO = {
  window: 2.5,
  maxMult: 8,
};

export const ENEMY_TYPES = {
  flicker: {
    radius: 13, health: 22, speed: 148, damage: 9, emberDamage: 7,
    score: 40, target: "nearest", color: "#b78cff", core: "#efe6ff",
  },
  mawmoth: {
    radius: 19, health: 46, speed: 104, damage: 14, emberDamage: 11,
    score: 70, target: "player", color: "#ff7a9e", core: "#ffe3ec",
  },
  spitjack: {
    radius: 17, health: 38, speed: 82, damage: 8, emberDamage: 9,
    score: 90, target: "either", color: "#7ee08a", core: "#eaffea",
    range: 330, spitInterval: 2.1, globSpeed: 265, globDamage: 10,
  },
  cragback: {
    radius: 31, health: 175, speed: 46, damage: 22, emberDamage: 20,
    score: 180, target: "ember", color: "#c9a06a", core: "#fff0d6",
    knockResist: 0.88,
  },
  broodpod: {
    radius: 24, health: 62, speed: 58, damage: 12, emberDamage: 12,
    score: 120, target: "ember", color: "#6ad6d0", core: "#e6fffd",
  },
  hollowking: {
    radius: 52, health: 1150, speed: 68, damage: 26, emberDamage: 26,
    score: 1500, target: "player", color: "#8f6bff", core: "#f2ecff",
    knockResist: 0.96,
  },
};

export const BOSS = {
  lesserHealth: 620,
  trueHealth: 1350,
  patternTime: 3.4,
  enragePatternTime: 2.2,
  enrageThreshold: 0.3,
  burstCount: 14,
  summonCount: 4,
  chargeSpeed: 430,
  chargeTelegraph: 0.7,
};

export const PICKUPS = {
  shardChance: 0.34,
  heartChance: 0.045,
  moteChance: 0.05,
  shardScore: 25,
  heartHeal: 22,
  magnetRadius: 92,
  collectRadius: 26,
  life: 11,
};

export const COLORS = {
  bg: "#0b0e1a",
  floor: "#12172b",
  floorAlt: "#151b31",
  wall: "#232c4d",
  wallEdge: "#3a4a7d",
  player: "#ffd166",
  playerCore: "#fff6d8",
  bolt: "#ffe08a",
  glob: "#a678ff",
  ember: "#ffb347",
  emberCore: "#fff3c4",
  text: "#f4f1e6",
  dim: "#9aa3c0",
  danger: "#ff5d6c",
  good: "#7ee08a",
};

export const FIXED_DT = 1 / 60;
