import { CARD_HEIGHT, CARD_WIDTH } from './defaults';
import type { CardLayers, CardTextConfig } from './types';
import { canvasFromAsset, loadImage, makeCanvas, makeMaskLayer } from './canvas';
import { renderBackLayer, renderTextLayer } from './textLayers';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getAlphaBounds(canvas: HTMLCanvasElement): Bounds {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法读取主体 Alpha');
  const { width, height, data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 28) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) throw new Error('没有检测到人物或动物主体');
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function drawContactShadow(ctx: CanvasRenderingContext2D, width: number, bottom: number): void {
  ctx.save();
  ctx.translate(512, bottom - 8);
  ctx.scale(1, 0.22);
  const radius = Math.max(220, Math.min(width * 0.52, 520));
  const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,.72)');
  gradient.addColorStop(0.58, 'rgba(0,18,28,.42)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function composeSubject(source: HTMLCanvasElement, bounds: Bounds): HTMLCanvasElement {
  const aspect = bounds.width / bounds.height;
  const horizontal = aspect > 1.05;
  const maxWidth = horizontal ? 880 : 760;
  const maxHeight = horizontal ? 700 : 1120;
  const bottom = horizontal ? 1320 : 1390;
  const fit = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  const targetWidth = bounds.width * fit;
  const targetHeight = bounds.height * fit;
  const targetX = 512 - targetWidth / 2;
  const targetY = bottom - targetHeight;

  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建主体层');

  drawContactShadow(ctx, targetWidth, bottom);

  ctx.save();
  ctx.filter = 'saturate(1.12) contrast(1.06) brightness(1.03)';
  ctx.shadowColor = 'rgba(66,243,255,.55)';
  ctx.shadowBlur = 30;
  ctx.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
  );
  ctx.filter = 'none';
  ctx.shadowBlur = 0;
  ctx.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
  );
  ctx.restore();

  return canvas;
}

function luma(data: Uint8ClampedArray, index: number): number {
  return data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
}

function createLineart(subject: HTMLCanvasElement): HTMLCanvasElement {
  const sourceCtx = subject.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx) throw new Error('无法读取主体线稿');
  const source = sourceCtx.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建线稿层');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const output = ctx.createImageData(CARD_WIDTH, CARD_HEIGHT);
  const data = source.data;

  for (let y = 1; y < CARD_HEIGHT - 1; y += 1) {
    for (let x = 1; x < CARD_WIDTH - 1; x += 1) {
      const index = (y * CARD_WIDTH + x) * 4;
      if (data[index + 3] < 8) continue;
      const left = index - 4;
      const right = index + 4;
      const up = index - CARD_WIDTH * 4;
      const down = index + CARD_WIDTH * 4;
      const lx = luma(data, right) - luma(data, left);
      const ly = luma(data, down) - luma(data, up);
      const ax = data[right + 3] - data[left + 3];
      const ay = data[down + 3] - data[up + 3];
      const edge = Math.min(
        255,
        Math.abs(lx) + Math.abs(ly) + Math.abs(ax) * 1.55 + Math.abs(ay) * 1.55,
      );
      if (edge > 24) {
        const value = 255 - Math.min(232, edge);
        output.data[index] = value;
        output.data[index + 1] = value;
        output.data[index + 2] = value;
        output.data[index + 3] = 255;
      }
    }
  }
  ctx.putImageData(output, 0, 0);
  return canvas;
}

async function cutoutToCanvas(blob: Blob): Promise<{ canvas: HTMLCanvasElement; bounds: Bounds }> {
  const image = await blobToImage(blob);
  const scale = Math.min(
    1,
    1600 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = makeCanvas(
    Math.max(1, Math.round(image.naturalWidth * scale)),
    Math.max(1, Math.round(image.naturalHeight * scale)),
  );
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法读取抠图结果');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const bounds = getAlphaBounds(canvas);
  return { canvas, bounds };
}

export async function createDemoLayers(config: CardTextConfig): Promise<CardLayers> {
  const [background, subject, effects, lineart, text, back] = await Promise.all([
    canvasFromAsset('assets/background.png'),
    canvasFromAsset('assets/demo-subject.png'),
    canvasFromAsset('assets/effects.png'),
    canvasFromAsset('assets/demo-lineart.png'),
    renderTextLayer(config),
    renderBackLayer(config),
  ]);
  return { background, subject, effects, lineart, text, back, mask: makeMaskLayer() };
}

export async function createUploadedLayers(
  cutout: Blob,
  config: CardTextConfig,
): Promise<CardLayers> {
  const { canvas, bounds } = await cutoutToCanvas(cutout);
  const subject = composeSubject(canvas, bounds);
  const lineart = createLineart(subject);
  const [background, effects, text, back] = await Promise.all([
    canvasFromAsset('assets/background.png'),
    canvasFromAsset('assets/effects.png'),
    renderTextLayer(config),
    renderBackLayer(config),
  ]);
  return { background, subject, effects, lineart, text, back, mask: makeMaskLayer() };
}

export async function loadDemoImageForFallback(): Promise<HTMLImageElement> {
  return loadImage('assets/demo-subject.png');
}
