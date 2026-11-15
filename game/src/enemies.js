// The gloom host: five enemy kinds plus the Hollow King. Each kind
// has its own steering, its own target preference, and its own drawn
// silhouette, so a mixed wave reads at a glance and forces the wisp
// to split attention between itself and the Ember.

import { ARENA, BOSS, ENEMY_TYPES } from "./config.js";

const MAX_ENEMIES = 160;

function blankEnemy() {
  return {
    alive: false, kind: "flicker", boss: false, x: 0, y: 0, vx: 0, vy: 0,
    hp: 1, maxHp: 1, radius: 12, speed: 100, damage: 8, emberDamage: 8,
    score: 40, color: "#ffffff", core: "#ffffff", flash: 0, wobble: 0,
    spitTimer: 0, touchTimer: 0, knockResist: 0, state: "stalk",
    stateTimer: 0, patternTimer: 0, patternIndex: 0, chargeX: 0, chargeY: 0,
    enraged: false, wingPhase: 0,
  };
}

export class EnemyManager {
  constructor(rng) {
    this.rng = rng;
    this.enemies = [];
    for (let i = 0; i < MAX_ENEMIES; i++) this.enemies.push(blankEnemy());
    this.bossRef = null;
  }

  countAlive() {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  spawn(kind, x, y, opts = {}) {
    const e = this.enemies.find((slot) => !slot.alive);
    if (!e) return null;
    const base = ENEMY_TYPES[kind];
    e.alive = true;
    e.kind = kind;
    e.boss = kind === "hollowking";
    e.x = x; e.y = y; e.vx = 0; e.vy = 0;
    e.maxHp = opts.health ?? base.health;
    e.hp = e.maxHp;
    e.radius = base.radius * (opts.scale ?? 1);
    e.speed = base.speed * this.rng.range(0.9, 1.1);
    e.damage = base.damage;
    e.emberDamage = base.emberDamage;
    e.score = base.score;
    e.color = base.color;
    e.core = base.core;
    e.flash = 0;
    e.wobble = this.rng.range(0, Math.PI * 2);
    e.spitTimer = this.rng.range(0.7, 1.6);
    e.touchTimer = 0;
    e.knockResist = base.knockResist ?? 0;
    e.state = "stalk";
    e.stateTimer = 0;
    e.patternTimer = BOSS.patternTime * 0.6;
    e.patternIndex = 0;
    e.enraged = false;
    e.wingPhase = this.rng.range(0, Math.PI * 2);
    if (e.boss) this.bossRef = e;
    return e;
  }

  damage(e, amount, kx, ky) {
    e.hp -= amount;
    e.flash = 0.09;
    const resist = 1 - e.knockResist;
    e.vx += kx * resist;
    e.vy += ky * resist;
    if (e.boss && !e.enraged && e.hp / e.maxHp < BOSS.enrageThreshold) {
      e.enraged = true;
    }
    return e.hp <= 0;
  }

  targetFor(e, player, ember) {
    const pref = ENEMY_TYPES[e.kind].target;
    if (pref === "player") return player;
    if (pref === "ember") return ember;
    if (pref === "either") {
      // Spitjacks shoot whichever they can reach; they drift toward
      // the Ember but will happily harass the wisp on the way.
      return ember;
    }
    const dp = Math.hypot(player.x - e.x, player.y - e.y);
    const de = Math.hypot(ember.x - e.x, ember.y - e.y);
    return dp < de ? player : ember;
  }

  steer(e, tx, ty, dt, speedMul = 1) {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const len = Math.hypot(dx, dy) || 1;
    const want = e.speed * speedMul;
    e.vx += ((dx / len) * want - e.vx) * Math.min(1, 3.2 * dt);
    e.vy += ((dy / len) * want - e.vy) * Math.min(1, 3.2 * dt);
  }

  update(dt, ctx) {
    const { player, ember } = ctx;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.touchTimer = Math.max(0, e.touchTimer - dt);
      e.wobble += dt * 5;
      e.wingPhase += dt * (e.boss ? 3 : 7);

      if (e.boss) this.updateBoss(e, dt, ctx);
      else if (e.kind === "flicker") {
        const t = this.targetFor(e, player, ember);
        this.steer(e, t.x + Math.sin(e.wobble * 1.7) * 34, t.y + Math.cos(e.wobble * 2.3) * 34, dt);
      } else if (e.kind === "mawmoth") {
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        const rush = dist < 190 ? 1.55 : 1;
        this.steer(e, player.x, player.y, dt, rush);
      } else if (e.kind === "spitjack") {
        this.updateSpitjack(e, dt, ctx);
      } else if (e.kind === "cragback") {
        this.steer(e, ember.x, ember.y, dt);
      } else if (e.kind === "broodpod") {
        this.steer(e, ember.x + Math.sin(e.wobble * 0.6) * 46, ember.y + Math.cos(e.wobble * 0.5) * 46, dt);
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const wall = ARENA.wall + e.radius * 0.4;
      e.x = Math.max(wall, Math.min(ARENA.width - wall, e.x));
      e.y = Math.max(wall, Math.min(ARENA.height - wall, e.y));
    }
    if (this.bossRef && !this.bossRef.alive) this.bossRef = null;
  }

  updateSpitjack(e, dt, ctx) {
    const { player, ember, projectiles, audio } = ctx;
    const stats = ENEMY_TYPES.spitjack;
    const distE = Math.hypot(ember.x - e.x, ember.y - e.y);
    const anchor = distE > stats.range ? ember : null;
    if (anchor) this.steer(e, anchor.x, anchor.y, dt);
    else {
      e.vx *= 1 - 2 * dt;
      e.vy *= 1 - 2 * dt;
    }
    e.spitTimer -= dt;
    if (e.spitTimer <= 0) {
      e.spitTimer = stats.spitInterval * this.rng.range(0.85, 1.2);
      const target = Math.hypot(player.x - e.x, player.y - e.y) < stats.range + 60 ? player : ember;
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      projectiles.fire(e.x, e.y, (dx / len) * stats.globSpeed, (dy / len) * stats.globSpeed, {
        friendly: false, radius: 7, damage: stats.globDamage, life: 2.4,
      });
      audio.hit();
    }
  }

  updateBoss(e, dt, ctx) {
    const { player, projectiles, audio } = ctx;
    const patternTime = e.enraged ? BOSS.enragePatternTime : BOSS.patternTime;
    if (e.state === "telegraph") {
      e.stateTimer -= dt;
      e.vx *= 1 - 4 * dt;
      e.vy *= 1 - 4 * dt;
      if (e.stateTimer <= 0) {
        e.state = "charge";
        e.stateTimer = 0.62;
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        e.chargeX = (dx / len) * BOSS.chargeSpeed * (e.enraged ? 1.2 : 1);
        e.chargeY = (dy / len) * BOSS.chargeSpeed * (e.enraged ? 1.2 : 1);
        audio.dash();
      }
      return;
    }
    if (e.state === "charge") {
      e.stateTimer -= dt;
      e.vx = e.chargeX;
      e.vy = e.chargeY;
      if (e.stateTimer <= 0) e.state = "stalk";
      return;
    }
    // Stalk the wisp, drifting in a slow menacing arc.
    this.steer(e, player.x + Math.sin(e.wobble * 0.4) * 60, player.y + Math.cos(e.wobble * 0.33) * 40, dt);
    e.patternTimer -= dt;
    if (e.patternTimer > 0) return;
    e.patternTimer = patternTime;
    const pattern = e.patternIndex % 3;
    e.patternIndex += 1;
    if (pattern === 0) {
      const count = BOSS.burstCount + (e.enraged ? 6 : 0);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + e.wobble;
        projectiles.fire(e.x, e.y, Math.cos(a) * 215, Math.sin(a) * 215, {
          friendly: false, radius: 7, damage: 12, life: 3,
        });
      }
      audio.explosion();
      ctx.onShake(5);
    } else if (pattern === 1) {
      for (let i = 0; i < BOSS.summonCount; i++) {
        const a = this.rng.range(0, Math.PI * 2);
        this.spawn("flicker", e.x + Math.cos(a) * 78, e.y + Math.sin(a) * 78);
      }
      audio.bossRoar();
    } else {
      e.state = "telegraph";
      e.stateTimer = BOSS.chargeTelegraph;
    }
  }

  draw(ctx) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      this.drawOne(ctx, e);
      if (!e.boss && e.hp < e.maxHp && (e.kind === "cragback" || e.kind === "broodpod")) {
        const w = e.radius * 1.7;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 4);
        ctx.fillStyle = "#ff8a7a";
        ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
  }

  drawOne(ctx, e) {
    const flash = e.flash > 0;
    const body = flash ? "#ffffff" : e.color;
    const core = flash ? "#ffffff" : e.core;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.kind === "flicker") {
      ctx.rotate(e.wobble * 0.6);
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = i % 2 === 0 ? e.radius : e.radius * 0.55;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    } else if (e.kind === "mawmoth" || e.boss) {
      const flap = Math.sin(e.wingPhase) * 0.35;
      const wing = e.boss ? 74 : 26;
      ctx.fillStyle = body;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.rotate(side * (0.5 + flap * side));
        ctx.beginPath();
        ctx.ellipse(side * wing * 0.62, -4, wing, wing * 0.52, side * 0.5, 0, Math.PI * 2);
        ctx.globalAlpha = 0.78;
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius * 0.52, e.radius * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      if (e.boss) {
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = -2; i <= 2; i++) {
          ctx.moveTo(i * 12, -e.radius * 0.72);
          ctx.lineTo(i * 12 + (i % 2 === 0 ? 0 : 4), -e.radius * 0.72 - 16);
        }
        ctx.stroke();
        if (e.state === "telegraph") {
          ctx.strokeStyle = "rgba(255,93,108,0.9)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 12 + Math.sin(e.wobble * 6) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else if (e.kind === "spitjack") {
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(0, 6, e.radius * 0.55 + Math.sin(e.wobble) * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#12351a";
      ctx.beginPath();
      ctx.arc(-6, -7, 2.6, 0, Math.PI * 2);
      ctx.arc(6, -7, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === "cragback") {
      ctx.rotate(0.4);
      ctx.fillStyle = body;
      ctx.beginPath();
      const points = 8;
      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;
        const r = e.radius * (i % 2 === 0 ? 1 : 0.82);
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffb347";
      ctx.beginPath();
      ctx.moveTo(-8, -e.radius * 0.7); ctx.lineTo(0, -e.radius * 1.05); ctx.lineTo(7, -e.radius * 0.66); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, -e.radius * 0.4); ctx.lineTo(19, -e.radius * 0.66); ctx.lineTo(20, -e.radius * 0.3); ctx.closePath(); ctx.fill();
    } else if (e.kind === "broodpod") {
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = core;
      for (let i = 0; i < 3; i++) {
        const a = e.wobble * 0.7 + (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 9, Math.sin(a) * 9, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (e.kind !== "spitjack") {
      ctx.fillStyle = e.boss ? "#2a1650" : core;
      ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    for (const e of this.enemies) e.alive = false;
    this.bossRef = null;
  }
}
