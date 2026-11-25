// Simmer & Serve — keyboard and mouse input.
// One clear job: turn keys and clicks into the intents the world reads each frame
// (a movement vector, an interact press, a confirm press, a pause press).

export const ACTION_INTERACT = 'interact';
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

/** Create the input reader for `canvas`. Call `poll()` once per frame. */
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let click = null; // {x, y} in canvas CSS pixels, consumed by poll()

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onClick);

  function down(...codes) {
    return codes.some((c) => keys.has(c));
  }
  function wasPressed(...codes) {
    return codes.some((c) => pressed.has(c));
  }

  return {
    /** Read this frame's intents and clear the edge-triggered ones. */
    poll() {
      const out = {
        move: { x: 0, y: 0 },
        interact: wasPressed('KeyE', 'Space'),
        confirm: wasPressed('Enter', 'Space', 'KeyE'),
        pause: wasPressed('KeyP', 'Escape'),
        mute: wasPressed('KeyM'),
        click,
      };
      if (down('ArrowLeft', 'KeyA')) out.move.x -= 1;
      if (down('ArrowRight', 'KeyD')) out.move.x += 1;
      if (down('ArrowUp', 'KeyW')) out.move.y -= 1;
      if (down('ArrowDown', 'KeyS')) out.move.y += 1;
      const len = Math.hypot(out.move.x, out.move.y);
      if (len > 0) {
        out.move.x /= len;
        out.move.y /= len;
      }
      pressed.clear();
      click = null;
      return out;
    },
    /** True while the interact key is held (for chopping). */
    interactHeld() {
      return keys.has('KeyE') || keys.has('Space');
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onClick);
    },
  };
}
