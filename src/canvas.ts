type CreateCanvasReturnType = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
};

export function createCanvas(): CreateCanvasReturnType {
  const canvas = document.querySelector<HTMLCanvasElement>("canvas");

  if (!canvas) {
    throw new Error("Canvas not found");
  }

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context not found");
  }

  window.addEventListener("resize", () => {
    updateCanvasSize(canvas);
  });

  window.addEventListener("DOMContentLoaded", () => {
    updateCanvasSize(canvas);
  });

  context.imageSmoothingEnabled = false;

  return { canvas, context };
}

export function updateCanvasSize(
  canvas: HTMLCanvasElement,
  percentage: number = 0.9
): void {
  const maxWidth = window.innerWidth * percentage;
  const maxHeight = window.innerHeight * percentage;

  const size = Math.min(maxWidth, maxHeight);

  canvas.width = size;
  canvas.height = size;
}
