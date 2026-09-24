import Phaser from 'phaser'

import { GameScene } from './scenes/GameScene'

export type GameCallbacks = {
  onScoreChange?: (score: number) => void
  onRunComplete?: (score: number) => void
  onRunLose?: (score: number) => void
  eventTarget?: EventTarget
}

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#1e1633',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
}

export function createGame(parent: HTMLElement, callbacks: GameCallbacks = {}) {
  return new Phaser.Game({
    ...gameConfig,
    parent,
    scene: [new GameScene(callbacks)],
  })
}
