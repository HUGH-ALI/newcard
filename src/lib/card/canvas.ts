import { CARD_HEIGHT, CARD_WIDTH } from './defaults';

export function makeCanvas(width = CARD_WIDTH, height = CARD_HEIGHT): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function publicAsset(path: string): string {
  const injectedBase = import.meta.env.MIAODA_CLIENT_BASE_PATH as string | undefined;
  const base = (injectedBase ?? import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
  return new URL(path, new URL(base, window.location.origin)).toString();
}

export function loadImage(source: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    if (typeof source === 'string') {
      image.src = source;
    } else {
      image.src = URL.createObjectURL(source);
    }
  });
}

export async function canvasFromAsset(path: string): Promise<HTMLCanvasElement> {
  const image = await loadImage(publicAsset(path));
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function makeMaskLayer(): HTMLCanvasElement {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建遮罩层');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = '#ffffff';
  roundedPath(ctx, 18, 18, CARD_WIDTH - 36, CARD_HEIGHT - 36, 72);
  ctx.fill();
  return canvas;
}

export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  fontFamily: string,
  weight = 700,
): number {
  let size = startSize;
  while (size > 18) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 4;
  }
  return size;
}

export async function ensureCardFonts(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load('700 62px Orbitron'),
    document.fonts.load('500 30px Orbitron'),
    document.fonts.load('900 170px "Noto Sans SC"'),
    document.fonts.load('900 150px "Noto Sans SC"'),
  ]).catch(() => undefined);
}
