import { createCanvas } from "./canvas";

// A 2D grid of cells
type CellPool = boolean[];

// RGB
const CELL_COLORS = [
  // Black / Dead
  255,
  // White / Alive
  0,
] as const;

// Sizing
const CELLS_PER_ROW = 100;
const BUFFER_SIZE = CELLS_PER_ROW * CELLS_PER_ROW;

interface GameState {
  isRunning: boolean;
  isMousePressed: boolean;

  bitsChanged: number;

  lastLoop: number;

  previous: CellPool;
  current: CellPool;
  next: CellPool;
  changed: CellPool;

  pixels: ImageData;
}

const state: GameState = {
  isRunning: false,
  isMousePressed: false,

  bitsChanged: 0,

  lastLoop: 0,

  previous: createBuffer(BUFFER_SIZE),
  current: createBuffer(BUFFER_SIZE),
  next: createBuffer(BUFFER_SIZE),
  pixels: new ImageData(CELLS_PER_ROW, CELLS_PER_ROW),
  changed: createBuffer(BUFFER_SIZE),
};

function createBuffer(size: number, defaultValue = false) {
  return Array.from({ length: size }).map(() => defaultValue);
}

function cloneBuffer(buffer: CellPool) {
  return buffer.slice();
}

function diffBuffers(a: CellPool, b: CellPool) {
  return a.map((cell, index) => cell !== b[index]);
}

// Find the count of live neighbors
function findNeighbors(cells: CellPool, index: number): number {
  // The neighbors of a cell are the cells that are horizontally, vertically, or diagonally adjacent.

  const t = index - CELLS_PER_ROW;
  const b = index + CELLS_PER_ROW;
  const l = index - 1;
  const r = index + 1;
  const tl = t - 1;
  const tr = t + 1;
  const bl = b - 1;
  const br = b + 1;

  const neighbors = [t, b, l, r, tl, tr, bl, br];

  let count = 0;

  for (let i = 0; i < neighbors.length; i++) {
    const neighbor = neighbors[i];

    count += Number(cells[neighbor]);
  }

  return count;
}

function tick() {
  state.previous = cloneBuffer(state.current);

  if (!state.isRunning) return;

  //  1. Any live cell with fewer than two live neighbors dies, as if by underpopulation.
  //  2. Any live cell with two or three live neighbors lives on to the next generation.
  //  3. Any live cell with more than three live neighbors dies, as if by overpopulation.
  //  4. Any dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.

  for (let i = 0; i < state.current.length; i++) {
    const neighbors = findNeighbors(state.current, i);
    const alive = state.current[i];

    if (alive && (neighbors < 2 || neighbors > 3)) {
      state.next[i] = false;
    }

    if (!alive && neighbors === 3) {
      state.next[i] = true;
    }
  }

  state.current = cloneBuffer(state.next);
}

async function render(context: CanvasRenderingContext2D) {
  state.changed = diffBuffers(state.current, state.previous);

  state.bitsChanged = 0;

  for (let i = 0; i < state.current.length; i++) {
    if (!state.changed[i]) continue;

    state.bitsChanged++;

    const x = i % CELLS_PER_ROW;
    const y = Math.floor(i / CELLS_PER_ROW);

    const index = (y * CELLS_PER_ROW + x) * 4;

    const color = CELL_COLORS[Number(state.current[i])];

    state.pixels.data[index] = color;
    state.pixels.data[index + 1] = color;
    state.pixels.data[index + 2] = color;
    state.pixels.data[index + 3] = 255;
  }

  if (state.bitsChanged === 0) return;

  const bitmap = await createImageBitmap(state.pixels, {
    resizeWidth: context.canvas.width,
    resizeHeight: context.canvas.height,
    resizeQuality: "pixelated",
  });

  // Draw pixels scaled to the canvas size
  context.drawImage(bitmap, 0, 0);

  // Render grid
  context.strokeStyle = "#555";

  bitmap.close();
}

function registerToggleButtonLogic() {
  const toggle = document.querySelector<HTMLButtonElement>("#toggle");

  if (!toggle) {
    throw new Error("Toggle button not found");
  }

  toggle.onclick = () => {
    state.isRunning = !state.isRunning;

    toggle.innerHTML = state.isRunning ? "Stop" : "Start";
  };
}

function registerResetButtonLogic() {
  const reset = document.querySelector<HTMLButtonElement>("#reset");

  if (!reset) {
    throw new Error("Reset button not found");
  }

  reset.onclick = () => {
    state.current = createBuffer(BUFFER_SIZE);
    state.next = createBuffer(BUFFER_SIZE);
  };
}

function registerRandomButtonLogic() {
  const random = document.querySelector<HTMLButtonElement>("#random");

  if (!random) {
    throw new Error("random button not found");
  }

  random.onclick = async () => {
    for (let i = 0; i < state.current.length; i++) {
      state.current[i] = Math.random() > 0.5;
    }
  };
}

function registerMouseDrawLogic(canvas: HTMLCanvasElement) {
  const prevent = (event: MouseEvent) => event.preventDefault();

  const draw = (event: MouseEvent) => {
    if (!state.isMousePressed) return;

    const isLeftMouseButton = event.buttons === 1;
    const isRightMouseButton = event.buttons === 2;

    const x = Math.floor((event.offsetX / canvas.width) * CELLS_PER_ROW);

    const y = Math.floor((event.offsetY / canvas.height) * CELLS_PER_ROW);

    const index = y * CELLS_PER_ROW + x;

    if (isLeftMouseButton) {
      state.current[index] = true;
    }

    if (isRightMouseButton) {
      state.current[index] = false;
    }
  };

  canvas.onmousedown = (event) => {
    state.isMousePressed = true;
    draw(event);
  };

  canvas.onmouseup = (event) => {
    state.isMousePressed = false;
    draw(event);
  };

  canvas.oncontextmenu = prevent;
  canvas.onclick = draw;
  canvas.onmousemove = draw;
}

function reportPerformance() {
  const TPS = Math.floor(1000 / (performance.now() - state.lastLoop));

  const code = document.querySelector("#performanceReport");

  if (!code) {
    throw new Error("Performance report not found");
  }

  const metrics = {
    TPS: TPS.toString().padStart(3, "0"),
    Changed: state.bitsChanged,
    Pixels: state.current.length,
    Ratio: ((state.bitsChanged / state.current.length) * 100).toFixed(2) + "%",
  };

  code.innerHTML = JSON.stringify(metrics, null, 2);
}

async function main() {
  const { canvas, context } = createCanvas();

  registerToggleButtonLogic();
  registerResetButtonLogic();
  registerRandomButtonLogic();
  registerMouseDrawLogic(canvas);

  const TPS = 1000 / 30;

  while (true) {
    render(context);
    tick();
    reportPerformance();

    state.lastLoop = performance.now();

    await new Promise((resolve) => setTimeout(resolve, TPS));
  }
}

main();
