// Full-screen panels: title, pause, upgrade choice, game over, and
// victory. These draw over the live arena so every screen still shows
// the world the player is defending.

import { ARENA, COLORS } from "./config.js";
import { upgradeCardRect } from "./upgrades.js";

function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(5,7,16,${alpha})`;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
}

function centered(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, ARENA.centerX, y);
}

function runStats(ctx, state, y) {
  const seconds = Math.floor(state.elapsed);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const lines = [
    `SCORE  ${state.score}`,
    `WAVES SURVIVED  ${state.wavesSurvived}/10`,
    `KILLS  ${state.kills}      TIME  ${mm}:${ss}`,
    `BEST  ${Math.max(state.best, state.score)}`,
  ];
  ctx.textAlign = "center";
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? "bold 26px system-ui, sans-serif" : "17px system-ui, sans-serif";
    ctx.fillStyle = i === 0 ? "#ffe08a" : COLORS.text;
    ctx.fillText(line, ARENA.centerX, y + i * 32);
  });
}

export function drawTitle(ctx, state) {
  veil(ctx, 0.36);
  centered(ctx, "EMBERWARD", 150, "bold 92px system-ui, sans-serif", "#ffd166");
  centered(ctx, "Guard the World-Ember. Outlast ten waves of gloom.", 258, "20px system-ui, sans-serif", COLORS.text);
  centered(ctx, "Move  WASD / Arrows        Aim  Mouse        Fire  Hold Click", 356, "17px system-ui, sans-serif", COLORS.dim);
  centered(ctx, "Dash  Space / Shift        Pause  P        Mute  M", 384, "17px system-ui, sans-serif", COLORS.dim);
  centered(ctx, "If the wisp falls — or the Ember dies — the light goes out.", 424, "16px system-ui, sans-serif", COLORS.dim);
  const pulse = 0.75 + Math.sin(state.time * 3) * 0.25;
  ctx.globalAlpha = pulse;
  centered(ctx, "Click or press Enter to begin", 492, "bold 24px system-ui, sans-serif", "#7ee08a");
  ctx.globalAlpha = 1;
  if (state.best > 0) centered(ctx, `BEST SCORE  ${state.best}`, 548, "16px system-ui, sans-serif", "#ffe08a");
}

export function drawPause(ctx) {
  veil(ctx, 0.6);
  centered(ctx, "PAUSED", 300, "bold 52px system-ui, sans-serif", COLORS.text);
  centered(ctx, "Press P or Esc to resume", 372, "18px system-ui, sans-serif", COLORS.dim);
}

export function drawGameOver(ctx, state) {
  veil(ctx, 0.62);
  centered(ctx, "THE EMBER FALLS", 168, "bold 64px system-ui, sans-serif", COLORS.danger);
  centered(
    ctx,
    state.ember.alive ? "The wisp was extinguished." : "The World-Ember was shattered.",
    244, "19px system-ui, sans-serif", COLORS.text,
  );
  runStats(ctx, state, 308);
  centered(ctx, "Press R or click to try again", 500, "bold 22px system-ui, sans-serif", "#7ee08a");
}

export function drawVictory(ctx, state) {
  veil(ctx, 0.5);
  centered(ctx, "THE EMBER ENDURES", 168, "bold 64px system-ui, sans-serif", "#ffd166");
  centered(ctx, "Ten waves broken. The light holds another dawn.", 244, "19px system-ui, sans-serif", COLORS.text);
  runStats(ctx, state, 308);
  centered(ctx, "Press R or click to play again", 500, "bold 22px system-ui, sans-serif", "#7ee08a");
}

export function drawUpgradeChoice(ctx, state) {
  veil(ctx, 0.66);
  centered(ctx, `WAVE ${state.waves.wave} CLEARED`, 168, "bold 40px system-ui, sans-serif", "#ffd166");
  centered(ctx, "Choose one blessing  (click, or press 1 / 2 / 3)", 222, "18px system-ui, sans-serif", COLORS.dim);
  state.choices.forEach((choice, i) => {
    const r = upgradeCardRect(i);
    const hover = state.input.mouseX >= r.x && state.input.mouseX <= r.x + r.w
      && state.input.mouseY >= r.y && state.input.mouseY <= r.y + r.h;
    ctx.fillStyle = hover ? "#26335f" : "#1a2342";
    ctx.strokeStyle = hover ? "#ffd166" : "#3a4a7d";
    ctx.lineWidth = hover ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillStyle = "#ffb347";
    ctx.fillText(`[ ${i + 1} ]   ${choice.icon}`, r.x + r.w / 2, r.y + 30);
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillStyle = COLORS.text;
    ctx.fillText(choice.name, r.x + r.w / 2, r.y + 66);
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillStyle = COLORS.dim;
    wrapText(ctx, choice.desc, r.x + r.w / 2, r.y + 104, r.w - 36, 20);
  });
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}
