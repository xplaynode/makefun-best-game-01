// Pooled projectiles: bright bolts from the wisp and heavy globs from
// Spitjacks and the Hollow King. One pool, a `friendly` flag per shot,
// and pierce support for upgraded bolts.

const MAX_SHOTS = 420;

export class ProjectilePool {
  constructor() {
    this.shots = [];
    for (let i = 0; i < MAX_SHOTS; i++) {
      this.shots.push({
        alive: false, friendly: true, x: 0, y: 0, vx: 0, vy: 0,
        radius: 5, damage: 10, pierce: 0, life: 0, hits: null,
      });
    }
    this.cursor = 0;
  }

  fire(x, y, vx, vy, opts = {}) {
    const s = this.shots[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_SHOTS;
    s.alive = true;
    s.friendly = opts.friendly !== false;
    s.x = x; s.y = y; s.vx = vx; s.vy = vy;
    s.radius = opts.radius ?? 5;
    s.damage = opts.damage ?? 10;
    s.pierce = opts.pierce ?? 0;
    s.life = opts.life ?? 1.4;
    if (!s.hits) s.hits = new Set();
    s.hits.clear();
    return s;
  }

  update(dt, width, height) {
    for (const s of this.shots) {
      if (!s.alive) continue;
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0 || s.x < -30 || s.x > width + 30 || s.y < -30 || s.y > height + 30) {
        s.alive = false;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.shots) {
      if (!s.alive) continue;
      if (s.friendly) {
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 3);
        grad.addColorStop(0, "rgba(255,246,216,0.95)");
        grad.addColorStop(0.35, "rgba(255,208,102,0.75)");
        grad.addColorStop(1, "rgba(255,160,60,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff6d8";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 2.4);
        grad.addColorStop(0, "rgba(242,236,255,0.95)");
        grad.addColorStop(0.4, "rgba(166,120,255,0.8)");
        grad.addColorStop(1, "rgba(110,60,220,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() {
    for (const s of this.shots) s.alive = false;
  }
}
