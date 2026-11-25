// Simmer & Serve — configuration: the kitchen layout, the recipes, the tuning.
// One clear job: every number the rest of the game reads lives here, so balancing
// the game means editing this file and no other.

// The fixed simulation step and the localStorage key for the best score.
export const STEP = 1 / 60;
export const BEST_KEY = 'simmer-and-serve-best';

// Logical playfield, drawn scaled to the canvas.
export const VIEW = { width: 1280, height: 720 };

// A shift lasts two minutes; the rush is the last thirty seconds.
export const SHIFT_SECONDS = 120;
export const RUSH_AT = 30;

// Movement and interaction.
export const CHEF_SPEED = 250; // px per second
export const CHEF_RADIUS = 20;
export const INTERACT_RANGE = 100;
export const CARRY_MAX = 1;

// Work timers, in seconds.
export const CHOP_SECONDS = 1.6;
export const GRILL_SECONDS = 5.0;
export const BURN_AFTER = 9.0; // a patty left on the grill past this is burnt
export const ORDER_PATIENT = 55; // seconds before an order walks out
export const ORDER_FIRST_DELAY = 4;
export const ORDER_MIN_GAP = 7;
export const ORDER_MAX_ON_BOARD = 3;

// Scoring.
export const SERVE_POINTS = 100;
export const TIP_PER_SECOND_LEFT = 2; // patience left, in whole seconds
export const COMBO_STEP = 0.25; // +25% per combo level, capped below
export const COMBO_MAX = 2.0;
export const MISS_PENALTY = 25;

// Ingredients: id, name, colour, the crate it comes from, what it needs.
export const INGREDIENTS = {
  bun: { name: 'Bun', color: '#e8a54b', dark: '#b97a28', needs: 'none' },
  patty: { name: 'Patty', color: '#a85b3f', dark: '#7c3f2a', needs: 'grill' },
  lettuce: { name: 'Lettuce', color: '#7dc24a', dark: '#4e8a2a', needs: 'chop' },
  tomato: { name: 'Tomato', color: '#e2483d', dark: '#a92c24', needs: 'chop' },
  cheese: { name: 'Cheese', color: '#f7c948', dark: '#d9a41f', needs: 'none' },
  onion: { name: 'Onion', color: '#e8e0f0', dark: '#b9a8cc', needs: 'chop' },
};

// A recipe is a plate: the list of prepared ingredients it needs, in serving order.
export const RECIPES = {
  burger: {
    name: 'Sunny Burger',
    needs: ['bun', 'patty', 'lettuce', 'tomato'],
    points: 120,
    color: '#e8a54b',
  },
  salad: {
    name: 'Garden Salad',
    needs: ['lettuce', 'tomato', 'onion'],
    points: 90,
    color: '#7dc24a',
  },
  melt: {
    name: 'Cheesy Melt',
    needs: ['bun', 'patty', 'cheese'],
    points: 100,
    color: '#f7c948',
  },
  stack: {
    name: 'Tower Stack',
    needs: ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'onion'],
    points: 180,
    color: '#c98ad6',
  },
};
export const RECIPE_ORDER = ['burger', 'salad', 'melt', 'stack'];

// Stations of the kitchen. x/y/w/h in playfield pixels. kind drives the rules;
// label is what the player reads; the crates hand out one ingredient each.
export const STATIONS = [
  { id: 'crates-bun', kind: 'crate', gives: 'bun', x: 40, y: 150, w: 120, h: 76, label: 'BUNS' },
  { id: 'crates-patty', kind: 'crate', gives: 'patty', x: 40, y: 246, w: 120, h: 76, label: 'PATTIES' },
  { id: 'crates-lettuce', kind: 'crate', gives: 'lettuce', x: 40, y: 342, w: 120, h: 76, label: 'LETTUCE' },
  { id: 'crates-tomato', kind: 'crate', gives: 'tomato', x: 40, y: 438, w: 120, h: 76, label: 'TOMATO' },
  { id: 'crates-cheese', kind: 'crate', gives: 'cheese', x: 40, y: 534, w: 120, h: 76, label: 'CHEESE' },
  { id: 'crates-onion', kind: 'crate', gives: 'onion', x: 40, y: 630, w: 120, h: 64, label: 'ONION' },
  { id: 'board', kind: 'board', x: 300, y: 560, w: 190, h: 110, label: 'CHOPPING BOARD' },
  { id: 'grill', kind: 'grill', x: 540, y: 560, w: 190, h: 110, label: 'GRILL' },
  { id: 'grill2', kind: 'grill', x: 780, y: 560, w: 190, h: 110, label: 'GRILL' },
  { id: 'plate', kind: 'plate', x: 1020, y: 560, w: 190, h: 110, label: 'PLATING' },
  { id: 'serve', kind: 'serve', x: 1020, y: 150, w: 190, h: 110, label: 'SERVE WINDOW' },
  { id: 'bin', kind: 'bin', x: 1020, y: 410, w: 190, h: 76, label: 'BIN' },
];

// The order board lives across the top of the room (ends before the timer panel).
export const BOARD = { x: 220, y: 24, w: 800, h: 104 };

// Where the chef starts each shift.
export const CHEF_START = { x: 640, y: 400 };

// Palette for the room and the UI.
export const COLORS = {
  floorA: '#c98f5f',
  floorB: '#bd8252',
  wall: '#7a4a2b',
  counterTop: '#f3e3c2',
  counterSide: '#8a5a33',
  board: '#e9c893',
  grill: '#3d3d46',
  plate: '#f5f2e8',
  serve: '#2e7d5b',
  bin: '#5b6470',
  ink: '#2b1d12',
  cream: '#fff6e3',
  gold: '#f7c948',
  red: '#e2483d',
  green: '#4e8a2a',
};
