// The World-Ember: a faceted crystal on a stone dais at the arena's
// heart. It regenerates slowly between waves only, pulses with a warm
// glow, and flashes an alarm state while something is chewing on it.

import { ARENA, EMBER } from "./config.js";

export class Ember {
  constructor() {
    this.x = ARENA.centerX;
    this.y = ARENA.centerY;
    this.radius = EMBER.radius;
    this.reset();
  }

  reset() {
    this.maxHealth = EMBER.maxHealth;
    this.health = this.maxHealth;
    this.alarmTimer = 0;
    this.hurtFlash = 0;
    this.pulse = 0;
    this.alive = true;
  }

  get healthFrac() {
    return this.maxHealth > 0 ? this.health / this.maxHealth : 0;
  }

  hurt(amount) {
    if (!this.alive) return false;
    this.health -= amount;
    this.alarmTimer = 1.4;
    this.hurtFlash = 0.25;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    return true;
  }

  repair(amount) {
    if (!this.alive) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  update(dt, betweenWaves) {
    this.pulse += dt;
    this.alarmTimer = Math.max(0, this.alarmTimer - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (betweenWaves && this.alive) {
      this.repair(EMBER.regenPerSecond * dt);
    }
  }

  draw(ctx) {
    const pulse = 1 + Math.sin(this.pulse * 2.4) * 0.05;
    const alarmed = this.alarmTimer > 0;
    ctx.save();

    // Dais.
    ctx.fillStyle = "#2a3358";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 26, 62, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#39477a";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 20, 54, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Halo.
    const haloR = 96 * pulse * (alarmed ? 1.08 : 1);
    const halo = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, haloR);
    halo.addColorStop(0, alarmed ? "rgba(255,110,90,0.4)" : "rgba(255,179,71,0.42)");
    halo.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(this.x, this.y, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Crystal facets: a tall diamond with inner cuts.
    const w = 30 * pulse;
    const top = this.y - 52 * pulse;
    const mid = this.y - 2;
    const bottom = this.y + 30 * pulse;
    const flash = this.hurtFlash > 0;
    const face = flash ? "#ffffff" : "#ffb347";
    const faceDark = flash ? "#ffe9e9" : "#e07f2e";
    const faceLight = flash ? "#ffffff" : "#ffd88a";

    ctx.beginPath();
    ctx.moveTo(this.x, top);
    ctx.lineTo(this.x + w, mid);
    ctx.lineTo(this.x, bottom);
    ctx.lineTo(this.x - w, mid);
    ctx.closePath();
    ctx.fillStyle = face;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.x, top);
    ctx.lineTo(this.x + w, mid);
    ctx.lineTo(this.x, mid);
    ctx.closePath();
    ctx.fillStyle = faceLight;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.x, mid);
    ctx.lineTo(this.x + w, mid);
    ctx.lineTo(this.x, bottom);
    ctx.closePath();
    ctx.fillStyle = faceDark;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,246,216,0.85)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(this.x, top);
    ctx.lineTo(this.x, bottom);
    ctx.moveTo(this.x - w, mid);
    ctx.lineTo(this.x + w, mid);
    ctx.stroke();

    // Bright core.
    const core = ctx.createRadialGradient(this.x, this.y - 6, 0, this.x, this.y - 6, 20);
    core.addColorStop(0, "rgba(255,246,216,0.95)");
    core.addColorStop(1, "rgba(255,200,100,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(this.x, this.y - 6, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
