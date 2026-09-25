import type { CardTextConfig, CardViewState } from './types';

export const CARD_WIDTH = 1024;
export const CARD_HEIGHT = 1536;

export const DEFAULT_TEXT: CardTextConfig = {
  topTitle: 'NEON PROTOCOL',
  mainTitle: '破界',
  frontSubtitle: 'HOLOGRAPHIC RARE CARD',
  frontGrade: 'CYBER GRADE · SSR',
  backTitle: 'NEON PROTOCOL',
  backSubtitle: 'HOLOGRAPHIC COLLECTIBLE CARD',
  serial: 'NP-0922-2026',
};

export const DEFAULT_VIEW_STATE: CardViewState = {
  rx: 0,
  ry: 0.16,
  scale: 1,
  flipped: false,
  auto: false,
  finish: 0,
  foil: 0.72,
  subjectScale: 1.02,
  subjectDepth: 0.4,
  effectsDepth: 0.55,
  backgroundDepth: -0.25,
};

export const FINISH_LABELS = ['镭射', '虹光', '星尘', '素面'];
