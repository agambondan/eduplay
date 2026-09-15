export function toCanvasCoords(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvasWidth / rect.width;
  const scaleY = canvasHeight / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}
