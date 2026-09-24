import type Phaser from 'phaser'

export type PlayerInput = {
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
}

export function createPlayerMovement(
  playerBody: Phaser.Physics.Arcade.Body,
  input: PlayerInput,
  speed = 180,
) {
  let x = 0
  let y = 0

  if (input.left.isDown) x -= 1
  if (input.right.isDown) x += 1
  if (input.up.isDown) y -= 1
  if (input.down.isDown) y += 1

  const length = Math.hypot(x, y) || 1
  playerBody.setVelocity((x / length) * speed, (y / length) * speed)
}
