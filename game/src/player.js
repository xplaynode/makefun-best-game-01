// The guardian wisp: crisp acceleration, mouse aim, hold-to-fire, and
// a dash that grants brief invulnerability. Drawn as a glowing orb
// with a flame leaning toward the aim direction and a fading trail.

import { ARENA, PLAYER } from "./config.js";

export class Player {
  constructor() {
    this.reset();
    // Upgradeable stats, mutated by the upgrade pool.
    this.damageMul = 1;
    this.fireInterval = PLAYER.fireInterval;
    this.projectileCount = 1;
    this.pierce = 0;
    this.dashCooldownMax = PLAYER.dashCooldown;
    this.moveSpeedMul = 1;
    this.critChance = 0;
    this.magnetMul = 1;
  }

  reset() {
    this.x = ARENA.centerX;
    this.y = ARENA.centerY + 150;
    this.vx = 0;
    this.vy = 0;
    this.radius = PLAYER.radius;
    this.maxHealth = PLAYER.maxHealth;
    this.health = this.maxHealth;
    this.aimX = 1;
    this.aimY = 0;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.invulnTimer = 0;
    this.contactTimer = 0;
    this.dashDirX = 1;
    this.dashDirY = 0;
    this.alive = true;
    this.trailTimer = 0;
    this.recoil = 0;
  }

  get dashReady() {
    return this.dashCooldown <= 0;
  }

  get invulnerable() {
    return this.invulnTimer > 0;
  }

  startDash(input) {
    let dx = input.axisX();
    let dy = input.axisY();
    if (dx === 0 && dy === 0) { dx = this.aimX; dy = this.aimY; }
    const len = Math.hypot(dx, dy) || 1;
    this.dashDirX = dx / len;
    this.dashDirY = dy / len;
    this.dashTimer = PLAYER.dashTime;
    this.dashCooldown = this.dashCooldownMax;
    this.invulnTimer = Math.max(this.invulnTimer, PLAYER.dashInvuln);
  }

  update(dt, input, fx) {
    if (!this.alive) return;
    this.aimX = input.mouseX - this.x;
    this.aimY = input.mouseY - this.y;
    const aimLen = Math.hypot(this.aimX, this.aimY) || 1;
    this.aimX /= aimLen;
    this.aimY /= aimLen;

    if ((input.wasPressed("Space", "ShiftLeft", "ShiftRight")) && this.dashReady) {
      this.startDash(input);
      fx.onDash(this);
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDirX * PLAYER.dashSpeed;
      this.vy = this.dashDirY * PLAYER.dashSpeed;
    } else {
      const ax = input.axisX();
      const ay = input.axisY();
      const len = Math.hypot(ax, ay) || 1;
      const maxSpeed = PLAYER.maxSpeed * this.moveSpeedMul;
      this.vx += (ax / len) * PLAYER.accel * dt * (ax !== 0 || ay !== 0 ? 1 : 0);
      this.vy += (ay / len) * PLAYER.accel * dt * (ax !== 0 || ay !== 0 ? 1 : 0);
      const damp = Math.max(0, 1 - PLAYER.friction * dt);
      if (ax === 0) this.vx *= damp;
      if (ay === 0) this.vy *= damp;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const wall = ARENA.wall + this.radius;
    this.x = Math.max(wall, Math.min(ARENA.width - wall, this.x));
    this.y = Math.max(wall, Math.min(ARENA.height - wall, this.y));

    this.fireTimer -= dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.contactTimer = Math.max(0, this.contactTimer - dt);
    this.recoil = Math.max(0, this.recoil - dt * 6);

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = this.dashTimer > 0 ? 0.012 : 0.05;
      fx.onTrail(this);
    }

    if (input.mouseDown && this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval;
      this.recoil = 1;
      fx.onFire(this);
    }
  }

  hurt(amount) {
    if (!this.alive || this.invulnerable || this.contactTimer > 0) return false;
    this.health -= amount;
    this.contactTimer = PLAYER.contactInvuln;
    this.invulnTimer = Math.max(this.invulnTimer, 0.25);
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    return true;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  draw(ctx, time) {
    if (!this.alive) return;
    const flicker = 1 + Math.sin(time * 11) * 0.06;
    ctx.save();
    if (this.invulnerable) ctx.globalAlpha = 0.65 + Math.sin(time * 40) * 0.2;
    const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 44 * flicker);
    glow.addColorStop(0, "rgba(255,214,120,0.55)");
    glow.addColorStop(1, "rgba(255,160,60,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 44 * flicker, 0, Math.PI * 2);
    ctx.fill();

    // Direction flame leaning away from the recoil, toward the aim.
    const flameX = this.x - this.aimX * (10 + this.recoil * 4);
    const flameY = this.y - this.aimY * (10 + this.recoil * 4);
    ctx.fillStyle = "#ff9d45";
    ctx.beginPath();
    ctx.ellipse(flameX, flameY, 7, 11, Math.atan2(this.aimY, this.aimX) + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(this.x - 4, this.y - 5, 1, this.x, this.y, this.radius);
    body.addColorStop(0, "#fff6d8");
    body.addColorStop(0.55, "#ffd166");
    body.addColorStop(1, "#f59e42");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * flicker, 0, Math.PI * 2);
    ctx.fill();

    // Aim eyes: two small sparks offset toward the mouse.
    ctx.fillStyle = "#59360b";
    const ex = this.aimX * 5;
    const ey = this.aimY * 5;
    ctx.beginPath();
    ctx.arc(this.x + ex - this.aimY * 4, this.y + ey + this.aimX * 4, 1.8, 0, Math.PI * 2);
    ctx.arc(this.x + ex + this.aimY * 4, this.y + ey - this.aimX * 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
