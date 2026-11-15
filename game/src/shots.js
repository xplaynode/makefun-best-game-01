// Deterministic screenshot scenes. When the URL carries ?shot=<name>,
// the game never free-runs and never reads the wall clock for the
// scene: it rebuilds the named moment from the seed, steps the
// simulation a fixed number of fixed-length ticks so everything
// looks mid-action, and then holds that exact composed frame.

import { ARENA, FIXED_DT } from "./config.js";

function stepScene(game, ticks) {
  for (let i = 0; i < ticks; i++) {
    game.time += FIXED_DT;
    game.enemies.update(FIXED_DT, game.enemyCtx());
    game.projectiles.update(FIXED_DT, ARENA.width, ARENA.height);
    game.particles.update(FIXED_DT);
    game.ember.update(FIXED_DT, false);
  }
}

function aimPlayer(game, tx, ty) {
  const p = game.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  p.aimX = dx / len;
  p.aimY = dy / len;
  game.input.mouseX = tx;
  game.input.mouseY = ty;
}

function fireBoltLine(game, from, angle, count, spacing) {
  for (let i = 0; i < count; i++) {
    const dist = 60 + i * spacing;
    game.projectiles.fire(
      from.x + Math.cos(angle) * dist,
      from.y + Math.sin(angle) * dist,
      Math.cos(angle) * 760,
      Math.sin(angle) * 760,
      { friendly: true, radius: 5, damage: 12, life: 1.1 },
    );
  }
}

function sceneTitle(game) {
  game.mode = "title";
  game.enemies.spawn("flicker", 150, 130);
  game.enemies.spawn("flicker", 1130, 590);
  game.enemies.spawn("mawmoth", 1080, 120);
  game.enemies.spawn("broodpod", 170, 580);
  game.enemies.spawn("spitjack", 640, 92);
  for (let i = 0; i < 26; i++) game.particles.ambientEmber(game.ember.x, game.ember.y);
  stepScene(game, 50);
}

function scenePlay(game) {
  game.mode = "playing";
  game.waves.wave = 6;
  game.waves.state = "active";
  game.score = 8420;
  game.kills = 87;
  game.elapsed = 273;
  game.wavesSurvived = 5;
  game.comboMult = 5;
  game.comboStreak = 8;
  game.comboTimer = 2.1;
  game.player.x = 430;
  game.player.y = 440;
  game.player.health = 70;
  game.ember.health = 400;
  aimPlayer(game, 790, 290);

  game.enemies.spawn("mawmoth", 800, 285);
  game.enemies.spawn("cragback", 920, 190);
  game.enemies.spawn("spitjack", 1010, 450);
  game.enemies.spawn("flicker", 705, 385);
  game.enemies.spawn("broodpod", 1060, 270);
  game.enemies.spawn("flicker", 615, 225);

  const angle = Math.atan2(290 - 440, 790 - 430);
  fireBoltLine(game, game.player, angle, 3, 74);
  game.pickups.push({ kind: "shard", x: 560, y: 380, vx: 0, vy: 0, life: 9, phase: 1 });
  game.pickups.push({ kind: "heart", x: 980, y: 540, vx: 0, vy: 0, life: 9, phase: 3 });
  stepScene(game, 26);
  // A kill that just happened, still sparkling, with its score popup.
  // Spawned after the main step so the burst is caught mid-bloom
  // instead of already faded.
  game.particles.burst(655, 330, "#b78cff", 20, 240, 3.4, 0.6);
  game.particles.burst(655, 330, "#efe6ff", 9, 150, 2.4, 0.4);
  game.particles.addText(655, 316, "+350", "#ffb347", 18);
  stepScene(game, 5);
  game.comboMult = 5;
  game.comboTimer = 2.1;
  game.player.health = 70;
  game.ember.health = 400;
}

function sceneBoss(game) {
  game.mode = "playing";
  game.waves.wave = 10;
  game.waves.state = "active";
  game.score = 19750;
  game.kills = 214;
  game.elapsed = 512;
  game.wavesSurvived = 9;
  game.comboMult = 3;
  game.comboStreak = 4;
  game.comboTimer = 1.8;
  game.player.x = 355;
  game.player.y = 475;
  game.player.health = 58;
  game.ember.health = 315;
  aimPlayer(game, 860, 235);

  const boss = game.enemies.spawn("hollowking", 860, 235, { health: 1350, scale: 1.15 });
  if (boss) boss.hp = 840;
  game.enemies.spawn("flicker", 1010, 470);
  game.enemies.spawn("flicker", 720, 120);

  // The radial burst, already in flight.
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.35;
    game.projectiles.fire(
      860 + Math.cos(a) * 95, 235 + Math.sin(a) * 95,
      Math.cos(a) * 215, Math.sin(a) * 215,
      { friendly: false, radius: 7, damage: 12, life: 3 },
    );
  }
  const angle = Math.atan2(235 - 475, 860 - 355);
  fireBoltLine(game, game.player, angle, 2, 80);

  // The wisp is mid-dash: a bright trail streaking behind it, and the
  // dash pip on the HUD correctly shows the dash as spent.
  game.player.dashTimer = 0.1;
  game.player.dashCooldown = game.player.dashCooldownMax * 0.55;
  game.player.dashDirX = 0.83;
  game.player.dashDirY = -0.55;
  for (let i = 0; i < 9; i++) {
    game.particles.spawn(355 - i * 17, 475 + i * 11, {
      vx: 0, vy: 0, color: "#ffe08a", size: 6 - i * 0.45, life: 0.9, drag: 0,
    });
  }
  stepScene(game, 18);
  if (boss) boss.hp = 840;
  game.player.health = 58;
  game.ember.health = 315;
  game.comboMult = 3;
  game.comboTimer = 1.8;
}

function sceneVictory(game) {
  game.mode = "victory";
  game.score = 23140;
  game.best = Math.max(game.best, 23140);
  game.kills = 236;
  game.elapsed = 586;
  game.wavesSurvived = 10;
  game.waves.wave = 10;
  game.player.x = ARENA.centerX - 120;
  game.player.y = ARENA.centerY + 120;
  aimPlayer(game, game.ember.x, game.ember.y);
  game.particles.burst(game.ember.x, game.ember.y, "#ffd166", 46, 260, 3.6, 1);
  game.particles.burst(game.ember.x, game.ember.y, "#fff3c4", 24, 160, 2.6, 0.8);
  for (let i = 0; i < 20; i++) game.particles.ambientEmber(game.ember.x, game.ember.y);
  stepScene(game, 22);
}

const SCENES = {
  title: sceneTitle,
  play: scenePlay,
  boss: sceneBoss,
  victory: sceneVictory,
};

export function setupShot(game, name, seed) {
  game.resetRun(seed);
  const scene = SCENES[name] ?? SCENES.title;
  scene(game);
}
