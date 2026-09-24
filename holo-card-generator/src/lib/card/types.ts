// EXPORTS: CardTextConfig, CardLayers, CardViewState, FinishMode
export interface CardTextConfig {
  topTitle: string;
  mainTitle: string;
  frontSubtitle: string;
  frontGrade: string;
  backTitle: string;
  backSubtitle: string;
  serial: string;
}

export interface CardLayers {
  background: HTMLCanvasElement;
  subject: HTMLCanvasElement;
  lineart: HTMLCanvasElement;
  effects: HTMLCanvasElement;
  text: HTMLCanvasElement;
  back: HTMLCanvasElement;
  mask: HTMLCanvasElement;
}

export type FinishMode = 0 | 1 | 2 | 3;

export interface CardViewState {
  rx: number;
  ry: number;
  scale: number;
  flipped: boolean;
  auto: boolean;
  finish: FinishMode;
  foil: number;
  subjectScale: number;
  subjectDepth: number;
  effectsDepth: number;
  backgroundDepth: number;
}
