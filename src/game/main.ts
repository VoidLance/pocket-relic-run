import Phaser from 'phaser'

class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: {
    A: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    W: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
  }

  constructor() {
    super('GameScene')
  }

  create() {
    this.add.text(20, 20, 'Pocket Relic Run — Phaser is working', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    })

    this.player = this.add.rectangle(120, 260, 24, 24, 0x4da6ff)
    this.physics.add.existing(this.player)

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.keys
  }

  update() {
    let x = 0
    let y = 0

    if (this.cursors.left.isDown || this.keys.A.isDown) x -= 1
    if (this.cursors.right.isDown || this.keys.D.isDown) x += 1
    if (this.cursors.up.isDown || this.keys.W.isDown) y -= 1
    if (this.cursors.down.isDown || this.keys.S.isDown) y += 1

    const length = Math.hypot(x, y) || 1
    const body = this.player.body as Phaser.Physics.Arcade.Body

    body.setVelocity((x / length) * 180, (y / length) * 180)
  }
}

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#1e1633',
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
    },
  },
  scene: GameScene,
}

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    ...gameConfig,
    parent,
  })
}
