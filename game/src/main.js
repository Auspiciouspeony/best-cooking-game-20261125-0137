// Simmer & Serve — boot and the one loop.
// One clear job: read input every frame, advance the world in fixed 1/60 s steps,
// paint what is there, and turn world events into sound. The game moves between
// four screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=title|rush|serve|done (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createWorld, drainEvents, resetWorld, nearestStation, stepWorld } from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

// Size the canvas to the window, keeping the 16:9 playfield.
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.min(w / 1280, h / 720);
  canvas.width = Math.floor(1280 * scale);
  canvas.height = Math.floor(720 * scale);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
}
window.addEventListener('resize', resize);
resize();
const world = createWorld(createRandom(seed));
window.__world = world; // playtest hook: lets a test read the live state
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function playEvents(events) {
  for (const event of events) {
    if (event.type === 'chop') audio.chop();
    else if (event.type === 'pickup') audio.pickup();
    else if (event.type === 'place') audio.place();
    else if (event.type === 'sizzle') audio.sizzle();
    else if (event.type === 'serve') audio.ding();
    else if (event.type === 'bad') audio.bad();
    else if (event.type === 'tick') audio.tick();
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetWorld(world);
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startMusic();
    announce('Playing. Serve the orders before their tickets run out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.state.score}. Served ${world.state.served}. Best ${best}.`);
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const intent = input.poll();
    // Click coordinates arrive in CSS pixels; the world works in playfield pixels.
    if (intent.click) {
      const rect = canvas.getBoundingClientRect();
      intent.clickScale = rect.width / 1280;
    }
    if (intent.mute) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (intent.confirm) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (intent.pause) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          stepWorld(world, STEP, intent, input.interactHeld());
          accumulator -= STEP;
        }
        playEvents(drainEvents(world));
        if (world.state.over) endGame();
      }
    } else if (screen === SCREEN_PAUSED) {
      if (intent.pause || intent.confirm) {
        screen = SCREEN_PLAY;
        last = performance.now();
        announce('Playing.');
      }
    } else if (screen === SCREEN_OVER) {
      if (intent.confirm) startGame();
    }
    const nearest = screen === SCREEN_PLAY ? nearestStation(world.state) : null;
    renderer.draw(world.state, screen, best, nearest);
    requestAnimationFrame(frame);
  }

  // Size the canvas to the window (resize() already ran once at boot).
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
