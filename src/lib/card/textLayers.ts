import { CARD_HEIGHT, CARD_WIDTH } from './defaults';
import type { CardTextConfig } from './types';
import { ensureCardFonts, fitFontSize, makeCanvas, roundedPath } from './canvas';

const CYAN = '#42F3FF';
const MAGENTA = '#FF3BB8';
const GOLD = '#FFD35C';
const INK = '#EDFAFF';
const ORBITRON = 'Orbitron, "Microsoft YaHei", Arial, sans-serif';
const NOTO = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

function drawCardFrame(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 6;
  roundedPath(ctx, 34, 34, 956, 1468, 58);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = MAGENTA;
  ctx.lineWidth = 2;
  roundedPath(ctx, 58, 58, 908, 1420, 44);
  ctx.stroke();

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.lineCap = 'square';
  const inset = 34;
  const len = 72;
  const corners: Array<[number, number, number, number]> = [
    [inset, inset, 1, 1],
    [CARD_WIDTH - inset, inset, -1, 1],
    [inset, CARD_HEIGHT - inset, 1, -1],
    [CARD_WIDTH - inset, CARD_HEIGHT - inset, -1, -1],
  ];
  corners.forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sx * len, y);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + sy * len);
    ctx.stroke();
  });
  ctx.restore();
}

function drawGuideMarks(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = CYAN;
  ctx.beginPath();
  ctx.moveTo(88, y);
  ctx.lineTo(166, y);
  ctx.stroke();
  ctx.strokeStyle = MAGENTA;
  ctx.beginPath();
  ctx.moveTo(858, y);
  ctx.lineTo(936, y);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(512, y - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVerticalTitle(ctx: CanvasRenderingContext2D, title: string): void {
  const chars = Array.from(title);
  const size = chars.length > 2 ? 118 : 150;
  const lineHeight = size * 1.08;
  const totalHeight = (chars.length - 1) * lineHeight;
  const x = 810;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${size}px ${NOTO}`;
  chars.forEach((char, index) => {
    const color = index % 2 === 0 ? CYAN : MAGENTA;
    const y = 700 - totalHeight / 2 + index * lineHeight;
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.strokeText(char, x, y);
    ctx.fillStyle = INK;
    ctx.fillText(char, x, y);
  });
  ctx.restore();
}

export async function renderTextLayer(config: CardTextConfig): Promise<HTMLCanvasElement> {
  await ensureCardFonts();
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建正面文字层');

  drawCardFrame(ctx);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(237,250,255,.96)';
  ctx.font = `700 62px ${ORBITRON}`;
  ctx.fillText(config.topTitle.toUpperCase(), 512, 145, 830);

  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(166,235,244,.88)';
  ctx.font = `400 30px ${ORBITRON}`;
  ctx.fillText(config.frontSubtitle.toUpperCase(), 512, 184, 830);
  ctx.restore();

  drawGuideMarks(ctx, 242);
  drawGuideMarks(ctx, 1283);
  drawVerticalTitle(ctx, config.mainTitle);

  ctx.save();
  ctx.translate(66, 1110);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.font = `500 22px ${ORBITRON}`;
  ctx.fillStyle = 'rgba(120,225,245,.72)';
  ctx.fillText(`${config.frontGrade.toUpperCase()} · ${config.serial}`, 0, 0, 760);
  ctx.restore();

  const label = config.frontGrade.toUpperCase();
  ctx.font = `600 38px ${ORBITRON}`;
  const pillWidth = Math.min(560, Math.max(330, ctx.measureText(label).width + 120));
  ctx.save();
  roundedPath(ctx, 512 - pillWidth / 2, 1390, pillWidth, 78, 26);
  ctx.fillStyle = 'rgba(36,44,58,.94)';
  ctx.fill();
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(label, 512, 1441, pillWidth - 48);
  ctx.restore();

  return canvas;
}

function drawBackGrid(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(66,243,255,.28)';
  ctx.lineWidth = 1;
  for (let x = 32; x <= 992; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CARD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 96; y <= 1456; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CARD_WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,59,184,.42)';
  ctx.lineWidth = 2;
  for (let y = 128; y <= 1408; y += 256) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CARD_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackCenterTitle(ctx: CanvasRenderingContext2D, title: string): void {
  const chars = Array.from(title);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (chars.length <= 3) {
    const size = chars.length === 1 ? 190 : chars.length === 2 ? 170 : 128;
    ctx.font = `900 ${size}px ${NOTO}`;
    const spacing = size * 0.82;
    const startX = 512 - ((chars.length - 1) * spacing) / 2;
    chars.forEach((char, index) => {
      const color = index % 2 === 0 ? CYAN : MAGENTA;
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = color;
      ctx.lineWidth = 7;
      const x = startX + index * spacing;
      ctx.strokeText(char, x, 735);
      ctx.fillStyle = INK;
      ctx.fillText(char, x, 735);
    });
  } else {
    const size = fitFontSize(ctx, title, 560, 110, NOTO, 900);
    ctx.font = `900 ${size}px ${NOTO}`;
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 6;
    ctx.strokeText(title, 512, 735);
    ctx.fillStyle = INK;
    ctx.fillText(title, 512, 735);
  }
  ctx.restore();
}

function drawBarcode(ctx: CanvasRenderingContext2D, serial: string): void {
  ctx.save();
  let x = 306;
  for (let i = 0; i < 38; i += 1) {
    const pseudo = Math.sin((i + 1) * 12.9898 + serial.length * 78.233) * 43758.5453;
    const width = 4 + Math.floor((pseudo - Math.floor(pseudo)) * 7);
    ctx.fillStyle = i % 3 === 0 ? GOLD : CYAN;
    ctx.fillRect(x, 1228, width, 92);
    x += width + 5;
  }
  ctx.restore();
}

export async function renderBackLayer(config: CardTextConfig): Promise<HTMLCanvasElement> {
  await ensureCardFonts();
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建卡背层');

  ctx.fillStyle = '#05070D';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  drawBackGrid(ctx);

  ctx.save();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 5;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 14;
  roundedPath(ctx, 34, 34, 956, 1468, 58);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = MAGENTA;
  ctx.lineWidth = 2;
  roundedPath(ctx, 58, 58, 908, 1420, 44);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `600 58px ${ORBITRON}`;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 14;
  ctx.fillText(config.backTitle.toUpperCase(), 512, 165, 820);
  ctx.font = `400 31px ${ORBITRON}`;
  ctx.fillStyle = 'rgba(165,218,230,.9)';
  ctx.shadowBlur = 6;
  ctx.fillText(config.backSubtitle.toUpperCase(), 512, 214, 840);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 5;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(512, 675, 330, 250, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = MAGENTA;
  ctx.lineWidth = 3;
  ctx.shadowColor = MAGENTA;
  ctx.beginPath();
  ctx.ellipse(512, 675, 272, 205, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.shadowColor = GOLD;
  ctx.beginPath();
  ctx.ellipse(512, 675, 210, 160, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawBackCenterTitle(ctx, config.mainTitle);

  const grade = config.frontGrade.toUpperCase();
  ctx.save();
  roundedPath(ctx, 256, 1038, 512, 82, 22);
  ctx.fillStyle = 'rgba(3,12,25,.94)';
  ctx.fill();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `500 36px ${ORBITRON}`;
  ctx.fillText(grade, 512, 1091, 460);
  ctx.restore();

  drawBarcode(ctx, config.serial);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(180,215,225,.9)';
  ctx.font = `500 30px ${ORBITRON}`;
  ctx.fillText(`SERIAL ${config.serial}`, 512, 1378, 620);
  ctx.restore();

  return canvas;
}
