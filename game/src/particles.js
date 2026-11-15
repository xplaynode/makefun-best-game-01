// Pooled particles and floating score text. Pools are preallocated so
// the hot loop never allocates: a full pool simply recycles its oldest
// slot. Rendering uses additive blending for the ember-glow look.

const MAX_PARTICLES = 900;
const MAX_TEXTS = 48;

export class ParticleSystem {
  constructor(rng) {
    this.rng = rng;
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: "#ffffff", drag: 1, gravity: 0, glow: true });
    }
    this.cursor = 0;
    this.texts = [];
    for (let i = 0; i < MAX_TEXTS; i++) {
      this.texts.push({ alive: false, x: 0, y: 0, vy: 0, life: 0, maxLife: 1, value: "", color: "#ffe08a", size: 15 });
    }
    this.textCursor = 0;
  }

  spawn(x, y, opts = {}) {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    p.alive = true;
    p.x = x; p.y = y;
    p.vx = opts.vx ?? 0; p.vy = opts.vy ?? 0;
    p.maxLife = opts.life ?? 0.5;
    p.life = p.maxLife;
    p.size = opts.size ?? 3;
    p.color = opts.color ?? "#ffd166";
    p.drag = opts.drag ?? 2.2;
    p.gravity = opts.gravity ?? 0;
    p.glow = opts.glow !== false;
  }

  burst(x, y, color, count = 14, speed = 220, size = 3.4, life = 0.55) {
    for (let i = 0; i < count; i++) {
      const angle = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(speed * 0.25, speed);
      this.spawn(x, y, {
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        color, size: this.rng.range(size * 0.5, size * 1.3),
        life: this.rng.range(life * 0.5, life),
      });
    }
  }

  trail(x, y, color, size = 5) {
    this.spawn(x, y, {
      vx: this.rng.range(-16, 16), vy: this.rng.range(-16, 16),
      color, size, life: this.rng.range(0.22, 0.4), drag: 1,
    });
  }

  ambientEmber(x, y) {
    const angle = this.rng.range(0, Math.PI * 2);
    const dist = this.rng.range(30, 90);
    this.spawn(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, {
      vx: this.rng.range(-8, 8), vy: this.rng.range(-34, -14),
      color: "#ffb347", size: this.rng.range(1.4, 3), life: this.rng.range(0.8, 1.6), drag: 0.2,
    });
  }

  addText(x, y, value, color = "#ffe08a", size = 15) {
    const t = this.texts[this.textCursor];
    this.textCursor = (this.textCursor + 1) % MAX_TEXTS;
    t.alive = true;
    t.x = x; t.y = y; t.vy = -56;
    t.maxLife = 0.85; t.life = t.maxLife;
    t.value = String(value);
    t.color = color; t.size = size;
  }

  update(dt) {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      const dragK = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragK; p.vy *= dragK;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (const t of this.texts) {
      if (!t.alive) continue;
      t.life -= dt;
      if (t.life <= 0) { t.alive = false; continue; }
      t.y += t.vy * dt;
      t.vy *= 1 - 2.4 * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      if (!p.alive) continue;
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = "center";
    for (const t of this.texts) {
      if (!t.alive) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / (t.maxLife * 0.6)));
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.value, t.x, t.y);
    }
    ctx.restore();
  }

  clear() {
    for (const p of this.particles) p.alive = false;
    for (const t of this.texts) t.alive = false;
  }
}
