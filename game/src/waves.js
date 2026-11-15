// Wave director: composition tables for all ten waves, spawn pacing
// through the four arena-edge gates, banners, and intermissions.
// Kinds unlock progressively so each wave teaches one new threat.

import { ARENA, BOSS } from "./config.js";

export const WAVE_TABLE = [
  null,
  { flicker: 7, mawmoth: 3 },
  { flicker: 8, mawmoth: 4, spitjack: 2 },
  { flicker: 9, mawmoth: 4, spitjack: 3, broodpod: 2 },
  { flicker: 9, mawmoth: 5, spitjack: 3, broodpod: 2, cragback: 1 },
  { flicker: 8, mawmoth: 4, spitjack: 3, broodpod: 2, boss: "lesser" },
  { flicker: 11, mawmoth: 6, spitjack: 4, broodpod: 3, cragback: 2 },
  { flicker: 12, mawmoth: 6, spitjack: 5, broodpod: 3, cragback: 2 },
  { flicker: 13, mawmoth: 7, spitjack: 5, broodpod: 4, cragback: 3 },
  { flicker: 14, mawmoth: 8, spitjack: 6, broodpod: 4, cragback: 3 },
  { flicker: 10, mawmoth: 6, spitjack: 4, broodpod: 3, cragback: 2, boss: "true" },
];

export const TOTAL_WAVES = 10;

const GATES = [
  { x: ARENA.wall + 10, y: ARENA.centerY },
  { x: ARENA.width - ARENA.wall - 10, y: ARENA.centerY },
  { x: ARENA.centerX, y: ARENA.wall + 10 },
  { x: ARENA.centerX, y: ARENA.height - ARENA.wall - 10 },
  { x: ARENA.wall + 10, y: ARENA.wall + 10 },
  { x: ARENA.width - ARENA.wall - 10, y: ARENA.height - ARENA.wall - 10 },
];

export class WaveDirector {
  constructor(rng, enemies) {
    this.rng = rng;
    this.enemies = enemies;
    this.reset();
  }

  reset() {
    this.wave = 0;
    this.queue = [];
    this.spawnTimer = 0;
    this.state = "intermission";
    this.intermission = 1.2;
    this.banner = "";
    this.bannerTimer = 0;
    this.bossSpawned = false;
  }

  buildQueue(wave) {
    const comp = WAVE_TABLE[wave];
    const list = [];
    for (const kind of ["flicker", "mawmoth", "spitjack", "broodpod", "cragback"]) {
      for (let i = 0; i < (comp[kind] ?? 0); i++) list.push(kind);
    }
    // Shuffle so kinds arrive interleaved, not in solid blocks.
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.float() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    if (comp.boss) list.push(comp.boss === "lesser" ? "boss:lesser" : "boss:true");
    return list;
  }

  startNextWave(events) {
    this.wave += 1;
    this.queue = this.buildQueue(this.wave);
    this.spawnTimer = 0.4;
    this.state = "spawning";
    this.bossSpawned = false;
    this.banner = this.wave === TOTAL_WAVES ? "WAVE 10 — THE HOLLOW KING" : `WAVE ${this.wave}`;
    this.bannerTimer = 2.2;
    events.onBanner(this.banner);
  }

  update(dt, events) {
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    if (this.state === "intermission") {
      this.intermission -= dt;
      if (this.intermission <= 0) {
        if (this.wave >= TOTAL_WAVES) return;
        this.startNextWave(events);
      }
      return;
    }
    if (this.state === "spawning" || this.state === "active") {
      if (this.queue.length > 0) {
        this.state = "spawning";
        this.spawnTimer -= dt;
        const interval = Math.max(0.32, 0.85 - this.wave * 0.05);
        if (this.spawnTimer <= 0) {
          this.spawnTimer = interval;
          this.spawnOne(events);
        }
      } else if (this.enemies.countAlive() === 0) {
        this.state = "cleared";
        events.onWaveCleared(this.wave);
      } else {
        this.state = "active";
      }
    }
  }

  spawnOne(events) {
    const item = this.queue.shift();
    if (!item) return;
    if (item.startsWith("boss:")) {
      const trueKing = item === "boss:true";
      const gate = GATES[2];
      const boss = this.enemies.spawn("hollowking", gate.x, gate.y + 30, {
        health: trueKing ? BOSS.trueHealth : BOSS.lesserHealth,
        scale: trueKing ? 1.15 : 0.95,
      });
      if (boss) {
        this.bossSpawned = true;
        this.banner = trueKing ? "THE HOLLOW KING" : "A LESSER HOLLOW KING";
        this.bannerTimer = 2.4;
        events.onBossSpawn(boss);
      }
      return;
    }
    const gate = this.rng.pick(GATES);
    const jitter = 26;
    this.enemies.spawn(
      item,
      gate.x + this.rng.range(-jitter, jitter),
      gate.y + this.rng.range(-jitter, jitter),
    );
  }

  beginIntermission(seconds) {
    this.state = "intermission";
    this.intermission = seconds;
  }

  get cleared() {
    return this.state === "cleared";
  }
}
