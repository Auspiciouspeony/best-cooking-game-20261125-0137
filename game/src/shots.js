// Simmer & Serve — the screenshot scenes behind ?shot=title|rush|serve|done.
// One clear job: stage a real world state for each scene, so every screenshot is
// a true render of the game's own code, with the same seed giving the same frame.
// The scenes are built by setting the world the way play would leave it: orders
// on the board, food mid-prep, a plate half assembled, a finished plate in hand.

import { RECIPES } from './config.js';
import { makeItem } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Stage `world` for the named scene; returns the screen to draw over it. */
export function stageShot(name, world) {
  const state = world.state;
  if (name === 'title') {
    state.timeLeft = 120;
    state.score = 0;
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'done') {
    state.timeLeft = 0;
    state.score = 1240;
    state.coins = 96;
    state.served = 9;
    state.missed = 2;
    state.combo = 0;
    state.bestCombo = 4;
    state.over = true;
    return { screen: SCREEN_OVER, best: 1240 };
  }

  // The rush scene: the cover. Orders on the board, a burger mid-assembly on
  // the plating counter, a patty on the grill, lettuce half-chopped, and the
  // chef carrying the chopped tomato it still needs.
  state.timeLeft = 84;
  state.score = 540;
  state.coins = 41;
  state.served = 4;
  state.combo = 3;
  state.bestCombo = 3;
  state.orders = [
    { id: 1, recipe: 'burger', patience: 38, maxPatience: 55 },
    { id: 2, recipe: 'salad', patience: 22, maxPatience: 55 },
    { id: 3, recipe: 'melt', patience: 47, maxPatience: 55 },
  ];
  state.board.item = makeItem('lettuce');
  state.board.item.prep = 'raw';
  state.board.progress = 0.6;
  const grill = state.grills.grill;
  grill.item = makeItem('patty');
  grill.item.prep = 'raw';
  grill.progress = 4.2;
  const grill2 = state.grills.grill2;
  grill2.item = makeItem('patty');
  grill2.item.prep = 'grilled';
  grill2.progress = 6.0;
  state.plate.items = [makeItem('bun'), makeItem('patty', 'grilled'), makeItem('lettuce', 'chopped')];
  state.chef.x = 1000;
  state.chef.y = 510;
  state.chef.dir = -1;
  state.carrying = makeItem('tomato', 'chopped');

  if (name === 'serve') {
    // The serve scene: the chef carries a finished Sunny Burger to the window,
    // with the salad still mid-assembly behind them.
    state.plate.items = [makeItem('lettuce', 'chopped'), makeItem('tomato', 'chopped')];
    state.carrying = {
      kind: 'plate',
      items: RECIPES.burger.needs.map((kind) => {
        if (kind === 'patty') return makeItem(kind, 'grilled');
        if (kind === 'lettuce' || kind === 'tomato') return makeItem(kind, 'chopped');
        return makeItem(kind);
      }),
    };
    state.chef.x = 1080;
    state.chef.y = 340;
    state.chef.dir = 1;
    state.score = 760;
    state.served = 6;
    state.combo = 4;
  }
  return { screen: SCREEN_PLAY, best: 1240 };
}
