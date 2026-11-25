// Simmer & Serve — the kitchen itself: state, orders, and the cooking rules.
// One clear job: everything that changes when the chef acts or time passes.
// Rendering lives in render.js; this file never draws anything.

import {
  BOARD,
  BURN_AFTER,
  CHEF_RADIUS,
  CHEF_SPEED,
  CHEF_START,
  CHOP_SECONDS,
  COMBO_MAX,
  COMBO_STEP,
  GRILL_SECONDS,
  INGREDIENTS,
  INTERACT_RANGE,
  MISS_PENALTY,
  ORDER_FIRST_DELAY,
  ORDER_MAX_ON_BOARD,
  ORDER_MIN_GAP,
  ORDER_PATIENT,
  RECIPES,
  RECIPE_ORDER,
  RUSH_AT,
  SERVE_POINTS,
  SHIFT_SECONDS,
  STATIONS,
  TIP_PER_SECOND_LEFT,
} from './config.js';

export const EVENT_SERVE = 1;
export const EVENT_MISS = 2;
export const EVENT_OVER = 4;

/** An item the chef can carry or leave on a station. */
export function makeItem(kind, prep) {
  return { kind, prep: prep ?? (INGREDIENTS[kind].needs === 'none' ? 'ready' : 'raw') };
}

/** Is this item ready to go on a plate? */
export function isPrepared(item) {
  if (!item) return false;
  const needs = INGREDIENTS[item.kind].needs;
  if (needs === 'none') return item.prep === 'ready';
  if (needs === 'chop') return item.prep === 'chopped';
  if (needs === 'grill') return item.prep === 'grilled';
  return false;
}

/** Does the plate's items match the recipe, as a multiset of kinds? */
export function plateMatches(items, recipeId) {
  const needs = [...RECIPES[recipeId].needs].sort();
  const have = items.map((i) => i.kind).sort();
  return needs.length === have.length && needs.every((k, i) => k === have[i]);
}

/** The station whose centre is nearest the chef, within interact range. */
export function nearestStation(state) {
  let best = null;
  let bestD = INTERACT_RANGE;
  for (const s of STATIONS) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    const d = Math.hypot(state.chef.x - cx, state.chef.y - cy);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Create a fresh shift. */
export function createWorld(random) {
  const state = {
    random,
    time: 0,
    timeLeft: SHIFT_SECONDS,
    score: 0,
    coins: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    over: false,
    rush: false,
    chef: { x: CHEF_START.x, y: CHEF_START.y, dir: 1, moving: false },
    carrying: null, // an item, or { kind: 'plate', items: [...] }
    board: { item: null, progress: 0 },
    grills: {}, // station id -> { item, progress }
    plate: { items: [] },
    serveSlot: null,
    orders: [],
    orderId: 0,
    spawnIn: ORDER_FIRST_DELAY,
    particles: [],
    floats: [], // floating score texts {x, y, text, life, color}
    events: [],
    chopTick: 0,
    lastTickSecond: -1,
  };
  for (const s of STATIONS) {
    if (s.kind === 'grill') state.grills[s.id] = { item: null, progress: 0 };
  }
  return { state };
}

/** Reset the world to a fresh shift (same random stream continues). */
export function resetWorld(world) {
  const fresh = createWorld(world.state.random);
  world.state = fresh.state;
}

function stationSlot(state, station) {
  if (station.kind === 'board') return state.board;
  if (station.kind === 'grill') return state.grills[station.id];
  return null;
}

function spawnParticle(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = state.random.next() * Math.PI * 2;
    const v = speed * (0.4 + state.random.next() * 0.8);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 30,
      life: 0.5 + state.random.next() * 0.4,
      maxLife: 0.9,
      color,
      size: 3 + state.random.next() * 4,
    });
  }
}

function floatText(state, x, y, text, color) {
  state.floats.push({ x, y, text, life: 1.2, color });
}

function pickRecipe(state) {
  const elapsed = SHIFT_SECONDS - state.timeLeft;
  const pool = elapsed > 45 ? RECIPE_ORDER : RECIPE_ORDER.slice(0, 3);
  return state.random.pick(pool);
}

function spawnOrder(state) {
  const recipe = pickRecipe(state);
  state.orderId += 1;
  state.orders.push({
    id: state.orderId,
    recipe,
    patience: ORDER_PATIENT,
    maxPatience: ORDER_PATIENT,
  });
  state.events.push({ type: 'order' });
}

function serveOrder(state, order) {
  const patienceLeft = Math.max(0, Math.floor(order.patience));
  const tip = patienceLeft * TIP_PER_SECOND_LEFT;
  const mult = 1 + Math.min(COMBO_MAX - 1, state.combo * COMBO_STEP);
  const points = Math.round((SERVE_POINTS + RECIPES[order.recipe].points * 0.5 + tip) * mult);
  state.score += points;
  state.coins += Math.round(points / 10);
  state.served += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.events.push({ type: 'serve' });
  const serve = STATIONS.find((s) => s.kind === 'serve');
  spawnParticle(state, serve.x + serve.w / 2, serve.y + serve.h / 2, '#f7c948', 14, 120);
  floatText(state, serve.x + serve.w / 2, serve.y - 12, `+${points}`, '#f7c948');
}

/** What happens when the chef presses interact at `station`. */
function interact(state, station) {
  const carrying = state.carrying;

  if (station.kind === 'crate') {
    if (carrying) return;
    state.carrying = makeItem(station.gives);
    state.events.push({ type: 'pickup' });
    return;
  }

  if (station.kind === 'bin') {
    if (!carrying) return;
    state.carrying = null;
    state.events.push({ type: 'place' });
    spawnParticle(state, station.x + station.w / 2, station.y + station.h / 2, '#8a93a0', 6, 60);
    return;
  }

  if (station.kind === 'board' || station.kind === 'grill') {
    const slot = stationSlot(state, station);
    if (!slot) return;
    if (slot.item === null) {
      if (!carrying || carrying.kind === 'plate') return;
      const needs = INGREDIENTS[carrying.kind].needs;
      if (station.kind === 'board' && needs !== 'chop') return;
      if (station.kind === 'grill' && needs !== 'grill') return;
      slot.item = carrying;
      slot.progress = 0;
      state.carrying = null;
      state.events.push({ type: 'place' });
      if (station.kind === 'grill') state.events.push({ type: 'sizzle' });
      return;
    }
    // Slot occupied: take the item back, if it is done (or burnt, to bin it).
    if (carrying) return;
    const item = slot.item;
    const done = station.kind === 'board'
      ? item.prep === 'chopped'
      : item.prep === 'grilled' || item.prep === 'burnt';
    if (!done) return;
    state.carrying = item;
    slot.item = null;
    slot.progress = 0;
    state.events.push({ type: 'pickup' });
    return;
  }

  if (station.kind === 'plate') {
    if (carrying && carrying.kind === 'plate') {
      // Put the plate back down.
      if (state.plate.items.length > 0) return;
      state.plate.items = carrying.items;
      state.carrying = null;
      state.events.push({ type: 'place' });
      return;
    }
    if (carrying) {
      // Add one prepared item to the plate.
      if (!isPrepared(carrying)) return;
      if (state.plate.items.length >= 6) return;
      state.plate.items.push(carrying);
      state.carrying = null;
      state.events.push({ type: 'place' });
      spawnParticle(state, station.x + station.w / 2, station.y + 20, '#ffffff', 5, 50);
      return;
    }
    // Empty hands: pick the plate up.
    if (state.plate.items.length === 0) return;
    state.carrying = { kind: 'plate', items: state.plate.items };
    state.plate.items = [];
    state.events.push({ type: 'pickup' });
    return;
  }

  if (station.kind === 'serve') {
    if (!carrying || carrying.kind !== 'plate') {
      if (carrying) state.events.push({ type: 'bad' });
      return;
    }
    const order = state.orders.find((o) => plateMatches(carrying.items, o.recipe));
    if (!order) {
      state.events.push({ type: 'bad' });
      floatText(state, station.x + station.w / 2, station.y - 12, 'No order wants this!', '#e2483d');
      return;
    }
    state.carrying = null;
    serveOrder(state, order);
  }
}

/** Push the chef out of a station rectangle (circle vs rect). */
function collideStations(state) {
  const c = state.chef;
  for (const s of STATIONS) {
    const nx = Math.max(s.x, Math.min(c.x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(c.y, s.y + s.h));
    const dx = c.x - nx;
    const dy = c.y - ny;
    const d = Math.hypot(dx, dy);
    if (d < CHEF_RADIUS && d > 0) {
      c.x = nx + (dx / d) * CHEF_RADIUS;
      c.y = ny + (dy / d) * CHEF_RADIUS;
    } else if (d === 0) {
      // Centre inside the rectangle: push out along the smallest penetration.
      const left = c.x - s.x;
      const right = s.x + s.w - c.x;
      const top = c.y - s.y;
      const bottom = s.y + s.h - c.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) c.x = s.x - CHEF_RADIUS;
      else if (m === right) c.x = s.x + s.w + CHEF_RADIUS;
      else if (m === top) c.y = s.y - CHEF_RADIUS;
      else c.y = s.y + s.h + CHEF_RADIUS;
    }
  }
  // The order board across the top is a wall too.
  if (c.y - CHEF_RADIUS < BOARD.y + BOARD.h) c.y = BOARD.y + BOARD.h + CHEF_RADIUS;
  c.x = Math.max(24 + CHEF_RADIUS, Math.min(VIEW_WIDTH - 24 - CHEF_RADIUS, c.x));
  c.y = Math.max(24 + CHEF_RADIUS, Math.min(VIEW_HEIGHT - 24 - CHEF_RADIUS, c.y));
}

// Playfield size, kept local so this file never imports the renderer.
const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;

/**
 * Advance the world by `dt` seconds. `input` is this frame's intents from
 * createInput().poll(); `interactHeld` is true while the interact key is down
 * (chopping). Returns a bitmask of EVENT_* flags for this step.
 */
export function stepWorld(world, dt, input, interactHeld) {
  const state = world.state;
  if (state.over) return 0;
  let events = 0;

  state.time += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.time);
  if (state.timeLeft <= RUSH_AT && !state.rush) {
    state.rush = true;
    state.events.push({ type: 'rush' });
  }

  // The last-seconds tick.
  const whole = Math.ceil(state.timeLeft);
  if (whole <= 5 && whole !== state.lastTickSecond && state.timeLeft > 0) {
    state.lastTickSecond = whole;
    state.events.push({ type: 'tick' });
  }

  // Move the chef.
  const c = state.chef;
  const mx = input.move.x;
  const my = input.move.y;
  c.moving = mx !== 0 || my !== 0;
  if (c.moving) {
    c.x += mx * CHEF_SPEED * dt;
    c.y += my * CHEF_SPEED * dt;
    if (mx !== 0) c.dir = mx > 0 ? 1 : -1;
    collideStations(state);
  }

  // Mouse click: walk toward the click is too much; a click on a nearby station
  // interacts with it, a click elsewhere is ignored.
  if (input.click) {
    const scale = input.clickScale ?? 1;
    const px = input.click.x / scale;
    const py = input.click.y / scale;
    const hit = STATIONS.find((s) => px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h);
    if (hit) {
      const d = Math.hypot(c.x - (hit.x + hit.w / 2), c.y - (hit.y + hit.h / 2));
      if (d <= INTERACT_RANGE + 60) interact(state, hit);
    }
  }

  if (input.interact) {
    const station = nearestStation(state);
    if (station) interact(state, station);
  }

  // Chopping: hold interact at the board while an item waits there.
  if (interactHeld && state.board.item && INGREDIENTS[state.board.item.kind].needs === 'chop'
    && state.board.item.prep === 'raw') {
    const station = STATIONS.find((s) => s.kind === 'board');
    const d = Math.hypot(c.x - (station.x + station.w / 2), c.y - (station.y + station.h / 2));
    if (d <= INTERACT_RANGE) {
      state.board.progress += dt / CHOP_SECONDS;
      state.chopTick += dt;
      if (state.chopTick > 0.4) {
        state.chopTick = 0;
        state.events.push({ type: 'chop' });
        spawnParticle(state, station.x + station.w / 2, station.y + 30, '#ffffff', 4, 70);
      }
      if (state.board.progress >= 1) {
        state.board.item.prep = 'chopped';
        state.board.progress = 0;
        state.events.push({ type: 'place' });
        spawnParticle(state, station.x + station.w / 2, station.y + 30, '#7dc24a', 10, 90);
      }
    }
  }

  // Grills cook on their own; a patty left too long burns.
  for (const id of Object.keys(state.grills)) {
    const slot = state.grills[id];
    if (!slot.item) continue;
    slot.progress += dt;
    if (slot.item.prep === 'raw' && slot.progress >= GRILL_SECONDS) {
      slot.item.prep = 'grilled';
      state.events.push({ type: 'sizzle' });
      const station = STATIONS.find((s) => s.id === id);
      spawnParticle(state, station.x + station.w / 2, station.y + 20, '#f7c948', 8, 80);
    } else if (slot.item.prep === 'grilled' && slot.progress >= BURN_AFTER) {
      slot.item.prep = 'burnt';
      state.events.push({ type: 'bad' });
    }
  }

  // Orders arrive, wait, and walk out.
  if (state.orders.length < ORDER_MAX_ON_BOARD) {
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      spawnOrder(state);
      const elapsed = SHIFT_SECONDS - state.timeLeft;
      const gap = Math.max(4.5, ORDER_MIN_GAP - elapsed * 0.03);
      state.spawnIn = gap + state.random.next() * 3;
    }
  }
  for (const order of [...state.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders = state.orders.filter((o) => o.id !== order.id);
      state.missed += 1;
      state.combo = 0;
      state.score = Math.max(0, state.score - MISS_PENALTY);
      events |= EVENT_MISS;
      state.events.push({ type: 'miss' });
      floatText(state, BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h + 18, 'Order walked out! -25', '#e2483d');
    }
  }

  // Particles and floating texts age.
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floats) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);

  if (state.timeLeft <= 0) {
    state.over = true;
    events |= EVENT_OVER;
  }
  if (state.events.some((e) => e.type === 'serve')) events |= EVENT_SERVE;
  return events;
}

/** Drain the queued sound events (main.js turns them into audio). */
export function drainEvents(world) {
  const out = world.state.events;
  world.state.events = [];
  return out;
}
