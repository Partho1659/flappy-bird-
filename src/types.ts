export type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

export interface Bird {
  x: number;
  y: number;
  radius: number;
  velocity: number;
  gravity: number;
  jump: number;
  rotation: number;
  wingAngle: number;
  wingSpeed: number;
  targetY?: number;
}

export interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  gap: number;
  passed: boolean;
}

export interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  opacity: number;
}

export interface Bush {
  x: number;
  radius: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type: 'feather' | 'star' | 'smoke' | 'spark';
}
