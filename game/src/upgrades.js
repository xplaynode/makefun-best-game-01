// Between-wave upgrades. After each cleared wave the game offers
// three distinct choices from this pool; every entry visibly changes
// how the next wave plays. `apply` receives the whole game state.

import { EMBER } from "./config.js";

export const UPGRADES = [
  {
    id: "damage", name: "Kindled Bolts", icon: "DMG",
    desc: "+25% bolt damage.",
    apply: (s) => { s.player.damageMul *= 1.25; },
  },
  {
    id: "firerate", name: "Rapid Ember", icon: "RPD",
    desc: "Fire 18% faster.",
    apply: (s) => { s.player.fireInterval *= 0.82; },
  },
  {
    id: "multishot", name: "Split Flame", icon: "SPL",
    desc: "+1 projectile per shot.",
    apply: (s) => { s.player.projectileCount += 1; },
  },
  {
    id: "pierce", name: "Piercing Light", icon: "PIR",
    desc: "Bolts pierce +1 enemy.",
    apply: (s) => { s.player.pierce += 1; },
  },
  {
    id: "dash", name: "Swift Ashes", icon: "DSH",
    desc: "Dash recharges 30% faster.",
    apply: (s) => { s.player.dashCooldownMax *= 0.7; },
  },
  {
    id: "speed", name: "Windstep", icon: "SPD",
    desc: "+12% move speed.",
    apply: (s) => { s.player.moveSpeedMul *= 1.12; },
  },
  {
    id: "vitality", name: "Wisp Vitality", icon: "VIT",
    desc: "+25 max health and heal 25.",
    apply: (s) => { s.player.maxHealth += 25; s.player.heal(25); },
  },
  {
    id: "repair", name: "Ember Mend", icon: "MND",
    desc: `Repair the Ember by ${EMBER.moteRepair * 4}.`,
    apply: (s) => { s.ember.repair(EMBER.moteRepair * 4); },
  },
  {
    id: "crit", name: "Spark Crit", icon: "CRT",
    desc: "+12% chance to crit for double damage.",
    apply: (s) => { s.player.critChance += 0.12; },
  },
  {
    id: "magnet", name: "Shard Magnet", icon: "MAG",
    desc: "Shards drift to you from twice as far.",
    apply: (s) => { s.player.magnetMul *= 2; },
  },
  {
    id: "ward", name: "Ember Ward", icon: "WRD",
    desc: "+75 Ember max health and repair 75.",
    apply: (s) => { s.ember.maxHealth += 75; s.ember.repair(75); },
  },
  {
    id: "regen", name: "Second Wind", icon: "WND",
    desc: "Heal 40 health right now.",
    apply: (s) => { s.player.heal(40); },
  },
];

export function rollChoices(rng, count = 3) {
  const pool = UPGRADES.slice();
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const idx = Math.floor(rng.float() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

// Panel geometry, shared by the screen renderer and click handling.
export function upgradeCardRect(index) {
  const w = 300;
  const h = 190;
  const gap = 28;
  const total = w * 3 + gap * 2;
  const x0 = 640 - total / 2;
  return { x: x0 + index * (w + gap), y: 300, w, h };
}
