// Simmer & Serve — every pixel the player sees.
// One clear job: draw the kitchen, the chef, the food and the screens from the
// world's state. It never changes the state.

import {
  BOARD,
  BURN_AFTER,
  COLORS,
  GRILL_SECONDS,
  INGREDIENTS,
  RECIPES,
  RUSH_AT,
  SHIFT_SECONDS,
  STATIONS,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Format seconds as M:SS. */
export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** One ingredient, drawn as a little face of food, `size` wide. */
export function drawIngredient(ctx, kind, prep, x, y, size) {
  const ing = INGREDIENTS[kind];
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'bun') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, s * 0.25, s, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.fillRect(-s, s * 0.25, s * 2, s * 0.28);
    ctx.fillStyle = '#fff6e3';
    ctx.beginPath();
    ctx.arc(-s * 0.4, -s * 0.35, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.3, -s * 0.55, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'patty') {
    ctx.fillStyle = prep === 'burnt' ? '#221a14' : ing.color;
    roundRect(ctx, -s, -s * 0.45, s * 2, s * 0.9, s * 0.4);
    ctx.fill();
    ctx.fillStyle = prep === 'burnt' ? '#3a2c20' : ing.dark;
    ctx.beginPath();
    ctx.arc(-s * 0.4, 0, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.35, -s * 0.1, s * 0.12, 0, Math.PI * 2);
    ctx.arc(0, s * 0.15, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'lettuce') {
    ctx.fillStyle = ing.color;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.arc(i * s * 0.55, s * 0.1, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = ing.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, s * 0.1);
    ctx.quadraticCurveTo(0, -s * 0.5, s * 0.7, s * 0.1);
    ctx.stroke();
  } else if (kind === 'tomato') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(-s * 0.25, -s * 0.95);
    ctx.lineTo(s * 0.25, -s * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.25, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'cheese') {
    ctx.fillStyle = ing.color;
    ctx.save();
    ctx.rotate(-0.12);
    ctx.fillRect(-s * 0.9, -s * 0.7, s * 1.8, s * 1.4);
    ctx.restore();
    ctx.fillStyle = ing.dark;
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.1, s * 0.16, 0, Math.PI * 2);
    ctx.arc(s * 0.4, s * 0.25, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'onion') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ing.dark;
    ctx.lineWidth = 2.5;
    for (const r of [0.6, 0.35]) {
      ctx.beginPath();
      ctx.arc(0, 0, s * r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (prep === 'chopped' && (kind === 'lettuce' || kind === 'tomato' || kind === 'onion')) {
    // Chopped food is drawn in pieces: the whole piece plus two diced bits.
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(-s * 0.75, s * 0.55, s * 0.32, 0, Math.PI * 2);
    ctx.arc(s * 0.75, s * 0.55, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ing.dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-s * 0.75, s * 0.55, s * 0.32, 0, Math.PI * 2);
    ctx.arc(s * 0.75, s * 0.55, s * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A plate with its items stacked on it, `size` wide. */
function drawPlate(ctx, items, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.plate;
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9bfa5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.78, s * 0.46, 0, 0, Math.PI * 2);
  ctx.stroke();
  items.forEach((item, i) => {
    drawIngredient(ctx, item.kind, item.prep, 0, -6 - i * 7, size * 0.62);
  });
  ctx.restore();
}

function drawProgressRing(ctx, x, y, r, frac, color) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
  ctx.stroke();
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, frac, color, bg = 'rgba(0,0,0,0.3)') {
  ctx.save();
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Create the renderer for `canvas`. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawStation(station, state, now) {
    const { x, y, w, h } = station;
    ctx.save();
    // Counter body.
    ctx.fillStyle = COLORS.counterSide;
    roundRect(ctx, x, y + 8, w, h, 10);
    ctx.fill();
    ctx.fillStyle = station.kind === 'grill' ? COLORS.grill : COLORS.counterTop;
    roundRect(ctx, x, y, w, h - 8, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h - 8, 10);
    ctx.stroke();

    const cx = x + w / 2;
    const cy = y + (h - 8) / 2;

    if (station.kind === 'crate') {
      drawIngredient(ctx, station.gives, 'raw', cx, cy - 8, 44);
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(station.label, cx, y + h - 16);
    } else if (station.kind === 'board') {
      const item = state.board.item;
      if (item) {
        drawIngredient(ctx, item.kind, item.prep, cx, cy - 4, 46);
        if (item.prep === 'raw') drawProgressRing(ctx, cx, cy - 4, 32, state.board.progress, '#e2483d');
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('empty board', cx, cy);
      }
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOLD E TO CHOP', cx, y + h - 14);
    } else if (station.kind === 'grill') {
      const slot = state.grills[station.id];
      const item = slot.item;
      if (item) {
        // Flames under the patty.
        const flick = Math.sin(now * 9 + station.x) * 3;
        ctx.fillStyle = '#f08c1e';
        ctx.beginPath();
        ctx.moveTo(cx - 26, cy + 16);
        ctx.quadraticCurveTo(cx - 12, cy - 12 - flick, cx, cy + 16);
        ctx.quadraticCurveTo(cx + 12, cy - 12 + flick, cx + 26, cy + 16);
        ctx.closePath();
        ctx.fill();
        drawIngredient(ctx, item.kind, item.prep, cx, cy - 8, 46);
        const frac = item.prep === 'burnt' ? 1 : Math.min(1, slot.progress / GRILL_SECONDS);
        const color = item.prep === 'burnt' ? '#221a14' : item.prep === 'grilled' ? '#4e8a2a' : '#f08c1e';
        drawProgressRing(ctx, cx, cy - 8, 32, frac, color);
        if (item.prep === 'grilled') {
          ctx.fillStyle = '#4e8a2a';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('READY!', cx, y + h - 14);
        } else if (item.prep === 'burnt') {
          ctx.fillStyle = '#e2483d';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('BURNT!', cx, y + h - 14);
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('grill is free', cx, cy);
      }
      ctx.fillStyle = '#fff6e3';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      if (!item) ctx.fillText('GRILL', cx, y + h - 14);
    } else if (station.kind === 'plate') {
      if (state.plate.items.length > 0) {
        drawPlate(ctx, state.plate.items, cx, cy - 2, 84);
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 42, 26, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ASSEMBLE HERE', cx, y + h - 14);
    } else if (station.kind === 'serve') {
      ctx.fillStyle = COLORS.serve;
      roundRect(ctx, x, y, w, h - 8, 10);
      ctx.fill();
      ctx.fillStyle = '#fff6e3';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SERVE  ▲', cx, cy - 2);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('match an order ticket', cx, cy + 18);
    } else if (station.kind === 'bin') {
      ctx.fillStyle = COLORS.bin;
      roundRect(ctx, x, y, w, h - 8, 10);
      ctx.fill();
      ctx.fillStyle = '#fff6e3';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BIN — toss it', cx, cy + 4);
    }
    ctx.restore();
  }

  function drawOrderBoard(state) {
    ctx.save();
    ctx.fillStyle = '#5d3a1e';
    roundRect(ctx, BOARD.x - 8, BOARD.y - 8, BOARD.w + 16, BOARD.h + 16, 12);
    ctx.fill();
    ctx.fillStyle = '#2b1d12';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ORDER BOARD', BOARD.x + 4, BOARD.y + 20);
    const slots = 3;
    const slotW = (BOARD.w - 130) / slots;
    for (let i = 0; i < slots; i += 1) {
      const order = state.orders[i];
      const sx = BOARD.x + 130 + i * slotW;
      const sy = BOARD.y + 4;
      const sw = slotW - 10;
      const sh = BOARD.h - 8;
      ctx.fillStyle = order ? '#fff6e3' : 'rgba(255,246,227,0.12)';
      roundRect(ctx, sx, sy, sw, sh, 8);
      ctx.fill();
      if (!order) {
        ctx.fillStyle = 'rgba(255,246,227,0.5)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('waiting…', sx + sw / 2, sy + sh / 2 + 5);
        continue;
      }
      const recipe = RECIPES[order.recipe];
      const frac = Math.max(0, order.patience / order.maxPatience);
      const urgent = frac < 0.35;
      ctx.fillStyle = urgent && Math.floor(performance.now() / 300) % 2 === 0 ? '#e2483d' : COLORS.ink;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name, sx + 10, sy + 22);
      // The dish, as icons of what it needs.
      recipe.needs.forEach((kind, j) => {
        drawIngredient(ctx, kind, 'raw', sx + 24 + j * 34, sy + 48, 26);
      });
      drawBar(ctx, sx + 10, sy + sh - 18, sw - 20, 10, frac, urgent ? '#e2483d' : '#4e8a2a');
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(order.patience)}s`, sx + sw - 10, sy + 22);
    }
    ctx.restore();
  }

  function drawChef(state, now) {
    const c = state.chef;
    ctx.save();
    ctx.translate(c.x, c.y);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const bob = c.moving ? Math.sin(now * 12) * 2 : 0;
    ctx.translate(0, bob);
    // Body: white coat, apron.
    ctx.fillStyle = '#fdfdf8';
    roundRect(ctx, -17, -8, 34, 30, 12);
    ctx.fill();
    ctx.fillStyle = '#7db8d9';
    roundRect(ctx, -12, 2, 24, 20, 6);
    ctx.fill();
    // Head and toque.
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath();
    ctx.arc(0, -18, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -30, 7, 0, Math.PI * 2);
    ctx.arc(0, -34, 8, 0, Math.PI * 2);
    ctx.arc(8, -30, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-13, -30, 26, 6);
    // Eyes look where the chef faces.
    ctx.fillStyle = '#2b1d12';
    ctx.beginPath();
    ctx.arc(c.dir * 3 - 4, -18, 1.8, 0, Math.PI * 2);
    ctx.arc(c.dir * 3 + 4, -18, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Carried item above the head.
    const carrying = state.carrying;
    if (carrying) {
      if (carrying.kind === 'plate') {
        drawPlate(ctx, carrying.items, 0, -58, 64);
      } else {
        drawIngredient(ctx, carrying.kind, carrying.prep, 0, -56, 40);
      }
    }
    ctx.restore();
  }

  function drawHud(state) {
    ctx.save();
    // Score panel, top left.
    ctx.fillStyle = 'rgba(43,29,18,0.85)';
    roundRect(ctx, 24, 24, 176, 104, 12);
    ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('SCORE', 38, 46);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(String(state.score), 38, 76);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#f7c948';
    ctx.fillText(`coins ${state.coins}   served ${state.served}`, 38, 100);
    if (state.combo >= 2) {
      ctx.fillStyle = '#f7c948';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.combo}`, 38, 120);
    }
    // Shift timer, top right.
    const done = state.timeLeft <= 0;
    const urgent = !done && state.timeLeft <= RUSH_AT;
    ctx.fillStyle = done ? '#5b6470' : urgent ? '#e2483d' : 'rgba(43,29,18,0.85)';
    roundRect(ctx, 1216 - 176, 24, 176, 104, 12);
    ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(done ? 'SHIFT OVER' : urgent ? 'RUSH — SHIFT ENDS' : 'SHIFT TIMER', 1216 - 88, 46);
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(formatTime(state.timeLeft), 1216 - 88, 84);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(done ? 'the pass is closed' : state.rush ? 'orders keep coming!' : 'take your time… for now', 1216 - 88, 106);
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px system-ui, sans-serif';
    for (const f of state.floats) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function drawHint(state, nearest) {
    if (!nearest) return;
    ctx.save();
    const cx = nearest.x + nearest.w / 2;
    const cy = nearest.y - 14;
    ctx.fillStyle = 'rgba(43,29,18,0.9)';
    const label = nearest.kind === 'board' ? 'E — chop (hold)' : 'E — use';
    ctx.font = 'bold 13px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 18;
    roundRect(ctx, cx - w / 2, cy - 16, w, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy - 1);
    // Pulsing ring on the station.
    ctx.strokeStyle = 'rgba(247,201,72,0.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -performance.now() / 40;
    roundRect(ctx, nearest.x - 5, nearest.y - 5, nearest.w + 10, nearest.h + 2, 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function overlay(title, lines, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(30,18,8,0.72)';
    ctx.fillRect(0, 0, 1280, 720);
    // The card fits its lines: title, then one line per entry, then a margin.
    const cardH = 228 + (lines.length - 1) * 28 + 50 - 110;
    ctx.fillStyle = '#fff6e3';
    roundRect(ctx, 340, 110, 600, cardH, 18);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, 640, 180);
    ctx.fillStyle = COLORS.ink;
    ctx.font = '17px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, 640, 228 + i * 28);
    });
    ctx.restore();
  }

  return {
    /** Draw the whole frame. `screen` is one of the SCREEN_* constants. */
    draw(state, screen, best, nearest) {
      const now = performance.now() / 1000;
      const scale = Math.min(canvas.width / 1280, canvas.height / 720);
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      // Floor: checker tiles.
      for (let ty = 0; ty < 9; ty += 1) {
        for (let tx = 0; tx < 16; tx += 1) {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
          ctx.fillRect(tx * 80, ty * 80, 80, 80);
        }
      }
      // Wall band behind the order board.
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(0, 0, 1280, 136);

      drawOrderBoard(state);
      for (const station of STATIONS) drawStation(station, state, now);
      drawChef(state, now);
      drawParticles(state);
      drawHud(state);
      if (screen === SCREEN_PLAY) drawHint(state, nearest);

      if (screen === SCREEN_TITLE) {
        overlay('SIMMER & SERVE', [
          'The lunch rush is on. Take orders, chop, grill,',
          'plate the dish and serve it before the ticket walks out.',
          '',
          'Move — WASD / arrows    Use — E (hold E to chop)',
          'Click a station to use it    P — pause    M — mute',
          '',
          'Burger: bun + grilled patty + lettuce + tomato',
          'Salad: lettuce + tomato + onion    Melt: bun + patty + cheese',
          '',
          best > 0 ? `Best score: ${best}` : 'First shift? Serve 5 dishes to beat the rush.',
          'Press ENTER to start your shift',
        ], '#e2483d');
      } else if (screen === SCREEN_PAUSED) {
        overlay('PAUSED', ['Take a breath. The tickets are waiting.', '', 'Press P to get back to the pass.'], '#7a4a2b');
      } else if (screen === SCREEN_OVER) {
        overlay('SHIFT OVER!', [
          `Score ${state.score}  ·  served ${state.served}  ·  walked out ${state.missed}`,
          `Best combo x${state.bestCombo}  ·  coins earned ${state.coins}`,
          '',
          state.served >= 8 ? 'The pass is proud of you. The regulars are already back.' : 'The regulars will be back tomorrow. So will you.',
          '',
          'Press ENTER to start another shift',
        ], '#2e7d5b');
      }
      ctx.restore();
    },
  };
}
