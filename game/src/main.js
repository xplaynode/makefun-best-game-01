// EMBERWARD boot and state machine. Owns the fixed-timestep loop,
// collisions, combo scoring, pickups, screen shake and hit-stop —
// the glue that turns the individual systems into a game.

import { ARENA, COLORS, COMBO, EMBER as EMBER_CFG, FIXED_DT, PICKUPS, PLAYER } from "./config.js";
import { Rng } from "./random.js";
import { Input } from "./input.js";
import { AudioEngine } from "./audio.js";
import { ParticleSystem } from "./particles.js";
import { ProjectilePool } from "./projectiles.js";
import { Player } from "./player.js";
import { Ember } from "./ember.js";
import { EnemyManager } from "./enemies.js";
import { WaveDirector, TOTAL_WAVES } from "./waves.js";
import { rollChoices, upgradeCardRect } from "./upgrades.js";
import { drawHUD } from "./hud.js";
import { drawGameOver, drawPause, drawTitle, drawUpgradeChoice, drawVictory } from "./screens.js";
import { setupShot } from "./shots.js";

const BEST_KEY = "emberward-best";

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function saveBest(value) {
  try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode */ }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.rng = new Rng(20261116);
    this.particles = new ParticleSystem(this.rng);
    this.projectiles = new ProjectilePool();
    this.player = new Player();
    this.ember = new Ember();
    this.enemies = new EnemyManager(this.rng);
    this.waves = new WaveDirector(this.rng, this.enemies);

    this.mode = "title";
    this.time = 0;
    this.elapsed = 0;
    this.score = 0;
    this.best = loadBest();
    this.kills = 0;
    this.wavesSurvived = 0;
    this.comboMult = 1;
    this.comboStreak = 0;
    this.comboTimer = 0;
    this.choices = [];
    this.pickups = [];
    this.shake = 0;
    this.hitStop = 0;
    this.hurtFlash = 0;
    this.ambientTimer = 0;
    this.shotMode = false;
    this.shotReadySet = false;

    this.waveEvents = {
      onBanner: () => {},
      onBossSpawn: () => {
        this.audio.bossRoar();
        this.addShake(9);
      },
      onWaveCleared: (wave) => this.handleWaveCleared(wave),
    };
  }

  resetRun(seed = 20261116) {
    this.rng = new Rng(seed);
    this.particles = new ParticleSystem(this.rng);
    this.enemies.rng = this.rng;
    this.waves.rng = this.rng;
    this.player = new Player();
    this.ember = new Ember();
    this.enemies.clear();
    this.projectiles.clear();
    this.waves.reset();
    this.score = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.wavesSurvived = 0;
    this.comboMult = 1;
    this.comboStreak = 0;
    this.comboTimer = 0;
    this.choices = [];
    this.pickups = [];
    this.shake = 0;
    this.hitStop = 0;
    this.hurtFlash = 0;
  }

  startRun() {
    this.resetRun((Math.random() * 1e9) | 0);
    this.mode = "playing";
    this.audio.ensure();
    this.waves.beginIntermission(0.6);
  }

  addShake(amount) {
    this.shake = Math.min(16, this.shake + amount);
  }

  addScore(base, x, y, showText = true) {
    const value = base * this.comboMult;
    this.score += value;
    if (showText) {
      this.particles.addText(x, y - 14, `+${value}`, this.comboMult > 1 ? "#ffb347" : "#ffe08a", this.comboMult >= 4 ? 18 : 14);
    }
    return value;
  }

  registerKill() {
    this.kills += 1;
    this.comboStreak += 1;
    this.comboTimer = COMBO.window;
    this.comboMult = Math.min(COMBO.maxMult, 1 + Math.floor(this.comboStreak / 2));
  }

  handleWaveCleared(wave) {
    this.wavesSurvived = wave;
    const bonus = 100 + wave * 50;
    this.score += bonus;
    this.particles.addText(ARENA.centerX, 210, `WAVE BONUS +${bonus}`, "#7ee08a", 20);
    if (wave >= TOTAL_WAVES) {
      this.finishRun(true);
      return;
    }
    this.choices = rollChoices(this.rng, 3);
    this.mode = "upgrade";
    this.audio.upgrade();
  }

  chooseUpgrade(index) {
    const choice = this.choices[index];
    if (!choice) return;
    choice.apply(this);
    this.choices = [];
    this.mode = "playing";
    this.waves.beginIntermission(1.4);
    this.audio.pickup();
  }

  finishRun(won) {
    this.mode = won ? "victory" : "gameover";
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
    }
    if (won) {
      this.audio.victory();
      this.particles.burst(this.ember.x, this.ember.y, "#ffd166", 70, 320, 4, 1.1);
      this.particles.burst(this.ember.x, this.ember.y, "#fff3c4", 40, 200, 3, 0.9);
    } else {
      this.audio.gameOver();
      this.addShake(14);
      this.particles.burst(this.ember.x, this.ember.y, "#ff5d6c", 60, 300, 4, 1);
    }
  }

  // ---- player callbacks -------------------------------------------------

  playerFx() {
    return {
      onDash: (p) => {
        this.audio.dash();
        this.particles.burst(p.x, p.y, "#ffd166", 8, 120, 2.6, 0.3);
      },
      onTrail: (p) => {
        this.particles.trail(p.x, p.y, p.dashTimer > 0 ? "#ffe08a" : "#f5a742", p.dashTimer > 0 ? 6 : 4);
      },
      onFire: (p) => this.firePlayer(p),
    };
  }

  firePlayer(p) {
    const count = p.projectileCount;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 0.085;
      const cos = Math.cos(offset);
      const sin = Math.sin(offset);
      const dx = p.aimX * cos - p.aimY * sin;
      const dy = p.aimX * sin + p.aimY * cos;
      this.projectiles.fire(
        p.x + dx * 18, p.y + dy * 18,
        dx * PLAYER.boltSpeed, dy * PLAYER.boltSpeed,
        { friendly: true, radius: PLAYER.boltRadius, damage: PLAYER.boltDamage * p.damageMul, pierce: p.pierce, life: 1.1 },
      );
    }
    this.audio.shoot();
    this.particles.spawn(p.x + p.aimX * 22, p.y + p.aimY * 22, {
      vx: p.aimX * 60, vy: p.aimY * 60, color: "#fff3c4", size: 4.5, life: 0.08, drag: 0,
    });
  }

  // ---- simulation -------------------------------------------------------

  update(dt) {
    this.time += dt;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.8);
    this.shake = Math.max(0, this.shake - dt * 34);

    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 0.14;
      this.particles.ambientEmber(this.ember.x, this.ember.y);
    }

    if (this.mode === "title" || this.mode === "victory" || this.mode === "gameover") {
      this.enemies.update(dt, this.enemyCtx());
      this.particles.update(dt);
      this.ember.update(dt, false);
      return;
    }
    if (this.mode !== "playing") {
      this.particles.update(dt);
      return;
    }

    this.elapsed += dt;
    this.player.update(dt, this.input, this.playerFx());
    this.waves.update(dt, this.waveEvents);
    this.ember.update(dt, this.waves.state === "intermission");
    this.enemies.update(dt, this.enemyCtx());
    this.projectiles.update(dt, ARENA.width, ARENA.height);
    this.collisions(dt);
    this.updatePickups(dt);
    this.particles.update(dt);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboStreak = 0;
        this.comboMult = 1;
      }
    }
    this.audio.updateMusic(dt, Math.max(1, this.waves.wave), true);

    if (!this.player.alive || !this.ember.alive) {
      this.finishRun(false);
    }
  }

  enemyCtx() {
    return {
      player: this.player,
      ember: this.ember,
      projectiles: this.projectiles,
      audio: this.audio,
      rng: this.rng,
      onShake: (n) => this.addShake(n),
    };
  }

  collisions(dt) {
    const player = this.player;
    const ember = this.ember;

    // Friendly bolts vs enemies; hostile globs vs wisp and Ember.
    for (const s of this.projectiles.shots) {
      if (!s.alive) continue;
      if (s.friendly) {
        for (const e of this.enemies.enemies) {
          if (!e.alive || s.hits.has(e)) continue;
          const rr = s.radius + e.radius;
          if ((s.x - e.x) ** 2 + (s.y - e.y) ** 2 > rr * rr) continue;
          s.hits.add(e);
          const crit = this.rng.chance(player.critChance);
          const amount = crit ? s.damage * 2 : s.damage;
          const speed = Math.hypot(s.vx, s.vy) || 1;
          const dead = this.enemies.damage(e, amount, (s.vx / speed) * 130, (s.vy / speed) * 130);
          this.particles.burst(s.x, s.y, crit ? "#ffd166" : "#cbb8ff", crit ? 9 : 5, 170, 2.6, 0.32);
          if (crit) this.particles.addText(e.x, e.y - e.radius, "CRIT", "#ffd166", 15);
          this.audio.hit();
          if (e.boss) this.hitStop = Math.max(this.hitStop, 0.018);
          if (dead) this.killEnemy(e);
          if (s.pierce > 0) s.pierce -= 1;
          else { s.alive = false; break; }
        }
      } else {
        const hitPlayer = player.alive && !player.invulnerable
          && (s.x - player.x) ** 2 + (s.y - player.y) ** 2 < (s.radius + player.radius) ** 2;
        const hitEmber = (s.x - ember.x) ** 2 + (s.y - ember.y) ** 2 < (s.radius + ember.radius) ** 2;
        if (hitPlayer) {
          s.alive = false;
          if (player.hurt(s.damage)) this.onPlayerHurt();
        } else if (hitEmber && ember.alive) {
          s.alive = false;
          if (ember.hurt(s.damage)) this.onEmberHurt();
        }
      }
    }

    // Body contact.
    for (const e of this.enemies.enemies) {
      if (!e.alive || e.touchTimer > 0) continue;
      if (player.alive && (e.x - player.x) ** 2 + (e.y - player.y) ** 2 < (e.radius + player.radius) ** 2) {
        if (player.hurt(e.damage)) {
          e.touchTimer = 0.7;
          this.onPlayerHurt();
        }
      } else if (ember.alive && (e.x - ember.x) ** 2 + (e.y - ember.y) ** 2 < (e.radius + ember.radius) ** 2) {
        if (ember.hurt(e.emberDamage)) {
          e.touchTimer = 0.85;
          this.onEmberHurt();
        }
      }
    }
    void dt;
  }

  onPlayerHurt() {
    this.hurtFlash = 1;
    this.hitStop = Math.max(this.hitStop, 0.045);
    this.addShake(6);
    this.audio.playerHurt();
    this.particles.burst(this.player.x, this.player.y, "#ff5d6c", 14, 220, 3, 0.45);
    this.comboStreak = 0;
    this.comboMult = 1;
    this.comboTimer = 0;
  }

  onEmberHurt() {
    this.addShake(7);
    this.audio.emberHurt();
    this.particles.burst(this.ember.x, this.ember.y - 10, "#ffb347", 12, 200, 3, 0.4);
  }

  killEnemy(e) {
    e.alive = false;
    this.registerKill();
    this.addScore(e.score, e.x, e.y);
    const big = e.boss || e.kind === "cragback";
    this.particles.burst(e.x, e.y, e.color, big ? 42 : 18, big ? 300 : 230, big ? 4.2 : 3.2, 0.6);
    this.particles.burst(e.x, e.y, e.core, 8, 150, 2.4, 0.4);
    this.audio.explosion();
    if (big) {
      this.addShake(e.boss ? 13 : 7);
      this.hitStop = Math.max(this.hitStop, e.boss ? 0.06 : 0.03);
    }
    if (e.kind === "broodpod") {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + this.rng.range(0, 1);
        const child = this.enemies.spawn("flicker", e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20);
        if (child) { child.vx = Math.cos(a) * 160; child.vy = Math.sin(a) * 160; }
      }
    }
    this.maybeDropPickup(e.x, e.y);
    if (e.boss && this.enemies.bossRef === e) this.enemies.bossRef = null;
  }

  maybeDropPickup(x, y) {
    const roll = this.rng.float();
    let kind = null;
    if (roll < PICKUPS.heartChance && this.player.health < this.player.maxHealth) kind = "heart";
    else if (roll < PICKUPS.heartChance + PICKUPS.moteChance) kind = "mote";
    else if (roll < PICKUPS.heartChance + PICKUPS.moteChance + PICKUPS.shardChance) kind = "shard";
    if (!kind) return;
    this.pickups.push({ kind, x, y, vx: this.rng.range(-30, 30), vy: this.rng.range(-30, 30), life: PICKUPS.life, phase: this.rng.range(0, 6) });
  }

  updatePickups(dt) {
    const player = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      if (p.life <= 0) { this.pickups.splice(i, 1); continue; }
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const magnet = PICKUPS.magnetRadius * player.magnetMul;
      if (player.alive && dist < magnet) {
        const pull = 420 * (1 - dist / magnet) + 120;
        p.vx += (dx / dist) * pull * dt * 4;
        p.vy += (dy / dist) * pull * dt * 4;
      }
      p.vx *= 1 - 2.4 * dt;
      p.vy *= 1 - 2.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (player.alive && dist < PICKUPS.collectRadius) {
        this.collectPickup(p);
        this.pickups.splice(i, 1);
      }
    }
  }

  collectPickup(p) {
    this.audio.pickup();
    if (p.kind === "shard") {
      this.score += PICKUPS.shardScore;
      this.particles.addText(this.player.x, this.player.y - 20, `+${PICKUPS.shardScore}`, "#7ee0ff", 13);
    } else if (p.kind === "heart") {
      this.player.heal(PICKUPS.heartHeal);
      this.particles.addText(this.player.x, this.player.y - 20, "+HEAL", "#7ee08a", 14);
    } else {
      this.ember.repair(EMBER_CFG.moteRepair);
      this.particles.addText(this.ember.x, this.ember.y - 52, "+EMBER", "#ffb347", 14);
    }
    this.particles.burst(p.x, p.y, "#fff3c4", 7, 130, 2.4, 0.3);
  }

  // ---- input for menus ----------------------------------------------------

  handleMenuInput() {
    const input = this.input;
    if (input.wasPressed("KeyM")) this.audio.toggleMute();

    if (this.mode === "title") {
      if (input.wasPressed("Enter") || input.clicked) this.startRun();
    } else if (this.mode === "gameover" || this.mode === "victory") {
      if (input.wasPressed("KeyR", "Enter") || input.clicked) this.startRun();
    } else if (this.mode === "upgrade") {
      if (input.wasPressed("Digit1")) this.chooseUpgrade(0);
      else if (input.wasPressed("Digit2")) this.chooseUpgrade(1);
      else if (input.wasPressed("Digit3")) this.chooseUpgrade(2);
      else if (input.clicked) {
        for (let i = 0; i < this.choices.length; i++) {
          const r = upgradeCardRect(i);
          if (input.mouseX >= r.x && input.mouseX <= r.x + r.w && input.mouseY >= r.y && input.mouseY <= r.y + r.h) {
            this.chooseUpgrade(i);
            break;
          }
        }
      }
    } else if (this.mode === "playing") {
      if (input.wasPressed("KeyP", "Escape")) this.mode = "paused";
    } else if (this.mode === "paused") {
      if (input.wasPressed("KeyP", "Escape", "Enter")) this.mode = "playing";
    }
  }

  // ---- drawing --------------------------------------------------------------

  drawArena(ctx) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    const tile = 64;
    for (let y = 0; y < ARENA.height / tile; y++) {
      for (let x = 0; x < ARENA.width / tile; x++) {
        if ((x + y) % 2 === 0) continue;
        ctx.fillStyle = COLORS.floorAlt;
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(ARENA.wall, ARENA.wall, ARENA.width - ARENA.wall * 2, ARENA.height - ARENA.wall * 2);
    // Concentric ward rings around the Ember.
    ctx.strokeStyle = "rgba(255,179,71,0.13)";
    ctx.lineWidth = 2;
    for (const r of [90, 150, 215]) {
      ctx.beginPath();
      ctx.arc(this.ember.x, this.ember.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Walls and gate runes.
    ctx.strokeStyle = COLORS.wallEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(ARENA.wall, ARENA.wall, ARENA.width - ARENA.wall * 2, ARENA.height - ARENA.wall * 2);
    ctx.fillStyle = "rgba(166,120,255,0.5)";
    const gates = [
      [ARENA.wall, ARENA.centerY], [ARENA.width - ARENA.wall, ARENA.centerY],
      [ARENA.centerX, ARENA.wall], [ARENA.centerX, ARENA.height - ARENA.wall],
    ];
    for (const [gx, gy] of gates) {
      ctx.beginPath();
      ctx.arc(gx, gy, 7 + Math.sin(this.time * 3) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPickups(ctx) {
    for (const p of this.pickups) {
      const blink = p.life < 2 ? (Math.sin(this.time * 18) > 0 ? 1 : 0.25) : 1;
      ctx.save();
      ctx.globalAlpha = blink;
      const bob = Math.sin(this.time * 4 + p.phase) * 3;
      if (p.kind === "shard") {
        ctx.fillStyle = "#7ee0ff";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8 + bob);
        ctx.lineTo(p.x + 6, p.y + bob);
        ctx.lineTo(p.x, p.y + 8 + bob);
        ctx.lineTo(p.x - 6, p.y + bob);
        ctx.closePath(); ctx.fill();
      } else if (p.kind === "heart") {
        ctx.fillStyle = "#ff7a9e";
        ctx.beginPath();
        ctx.arc(p.x - 4, p.y - 2 + bob, 5, 0, Math.PI * 2);
        ctx.arc(p.x + 4, p.y - 2 + bob, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y + bob);
        ctx.lineTo(p.x + 8, p.y + bob);
        ctx.lineTo(p.x, p.y + 10 + bob);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = "#ffb347";
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff3c4";
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawOverlays(ctx) {
    if (this.hurtFlash > 0) {
      const grad = ctx.createRadialGradient(640, 360, 300, 640, 360, 720);
      grad.addColorStop(0, "rgba(255,40,60,0)");
      grad.addColorStop(1, `rgba(255,40,60,${0.4 * this.hurtFlash})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    }
    if (this.ember.alarmTimer > 0 && this.mode === "playing") {
      const a = 0.16 + Math.sin(this.time * 9) * 0.07;
      const grad = ctx.createRadialGradient(640, 360, 340, 640, 360, 720);
      grad.addColorStop(0, "rgba(255,160,60,0)");
      grad.addColorStop(1, `rgba(255,150,50,${a})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    this.drawArena(ctx);
    this.drawPickups(ctx);
    this.ember.draw(ctx);
    this.enemies.draw(ctx);
    if (this.mode !== "title") this.player.draw(ctx, this.time);
    this.projectiles.draw(ctx);
    this.particles.draw(ctx);
    ctx.restore();

    this.drawOverlays(ctx);
    if (this.mode === "playing" || this.mode === "upgrade" || this.mode === "paused") {
      drawHUD(this.ctx, this);
    }
    if (this.mode === "title") drawTitle(this.ctx, this);
    else if (this.mode === "paused") drawPause(this.ctx);
    else if (this.mode === "upgrade") drawUpgradeChoice(this.ctx, this);
    else if (this.mode === "gameover") drawGameOver(this.ctx, this);
    else if (this.mode === "victory") drawVictory(this.ctx, this);
  }
}

// ---- boot -------------------------------------------------------------------

function boot() {
  const canvas = document.getElementById("game");
  const game = new Game(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  const seed = Number(params.get("seed") ?? 7) || 7;

  if (shot) {
    game.shotMode = true;
    game.audio.setSilent(true);
    game.input.enabled = false;
    setupShot(game, shot, seed);
    game.draw();
    window.__shotReady = true;
    // Keep redrawing the identical composed frame; no free-running.
    const renderStatic = () => {
      game.draw();
      requestAnimationFrame(renderStatic);
    };
    requestAnimationFrame(renderStatic);
    return;
  }

  let last = performance.now();
  let accumulator = 0;
  const frame = (now) => {
    let delta = (now - last) / 1000;
    last = now;
    if (delta > 0.25) delta = 0.25;
    accumulator += delta;
    game.handleMenuInput();
    while (accumulator >= FIXED_DT) {
      game.update(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    game.draw();
    game.input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
