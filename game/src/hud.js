// Heads-up display: everything the player needs in a fight, drawn
// last, with no DOM churn. Bars for the wisp and the Ember, the wave
// and score, the combo multiplier with its decay, a dash pip, the
// boss bar, and the persistent best score.

import { ARENA, COLORS, COMBO } from "./config.js";

function bar(ctx, x, y, w, h, frac, fill, back = "rgba(8,10,20,0.72)") {
  const f = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1.5, y + 1.5, (w - 3) * f, h - 3);
  ctx.strokeStyle = "rgba(244,241,230,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export function drawHUD(ctx, state) {
  const { player, ember, waves } = state;
  ctx.save();
  ctx.textBaseline = "top";

  // Player health, top-left.
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "left";
  ctx.fillText("WISP", 22, 16);
  bar(ctx, 22, 34, 220, 14, player.health / player.maxHealth, player.health > 30 ? "#ffd166" : COLORS.danger);

  // Ember health, top-center under a label.
  ctx.textAlign = "center";
  ctx.fillText("WORLD-EMBER", ARENA.centerX, 16);
  const emberFrac = ember.health / ember.maxHealth;
  bar(ctx, ARENA.centerX - 150, 34, 300, 14, emberFrac, emberFrac > 0.3 ? "#ffb347" : COLORS.danger);
  if (ember.alarmTimer > 0) {
    ctx.fillStyle = COLORS.danger;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("UNDER ATTACK", ARENA.centerX, 52);
  }

  // Wave and score, top-right.
  ctx.textAlign = "right";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`WAVE ${Math.max(1, waves.wave)}/10`, ARENA.width - 22, 14);
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillStyle = "#ffe08a";
  ctx.fillText(`${state.score}`, ARENA.width - 22, 40);
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`BEST ${Math.max(state.best, state.score)}`, ARENA.width - 22, 60);

  // Combo, left under the health bar, with its decay bar.
  if (state.comboMult > 1) {
    ctx.textAlign = "left";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillStyle = "#ffb347";
    ctx.fillText(`x${state.comboMult} COMBO`, 22, 58);
    bar(ctx, 22, 86, 130, 6, state.comboTimer / COMBO.window, "#ffb347");
  }

  // Dash cooldown pip, bottom-left.
  ctx.textAlign = "left";
  ctx.font = "bold 12px system-ui, sans-serif";
  const dashFrac = 1 - player.dashCooldown / player.dashCooldownMax;
  ctx.fillStyle = player.dashReady ? "#7ee08a" : COLORS.dim;
  ctx.fillText(player.dashReady ? "DASH READY (SPACE)" : "DASH", 22, ARENA.height - 44);
  bar(ctx, 22, ARENA.height - 26, 110, 8, dashFrac, "#7ee08a");

  // Enemies remaining, bottom-right.
  ctx.textAlign = "right";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = COLORS.dim;
  const left = state.enemies.countAlive() + state.waves.queue.length;
  ctx.fillText(`GLOOM REMAINING ${left}`, ARENA.width - 22, ARENA.height - 28);

  // Boss bar, bottom-center, whenever a boss lives.
  const boss = state.enemies.bossRef;
  if (boss && boss.alive) {
    ctx.textAlign = "center";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillStyle = "#d9c8ff";
    ctx.fillText(boss.enraged ? "THE HOLLOW KING — ENRAGED" : "THE HOLLOW KING", ARENA.centerX, ARENA.height - 52);
    bar(ctx, ARENA.centerX - 240, ARENA.height - 32, 480, 13, boss.hp / boss.maxHp, "#8f6bff");
  }

  // Wave banner.
  if (waves.bannerTimer > 0 && waves.banner) {
    const a = Math.min(1, waves.bannerTimer / 0.5);
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillStyle = COLORS.text;
    ctx.fillText(waves.banner, ARENA.centerX, 128);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
