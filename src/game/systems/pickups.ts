import type Phaser from 'phaser'

export function createShard(scene: Phaser.Scene, x: number, y: number) {
  const shard = scene.add.circle(x, y, 12, 0xffd54a)
  shard.setDepth(5)
  shard.setAlpha(0.95)
  scene.physics.add.existing(shard, true)

  scene.tweens.add({
    targets: shard,
    y: y - 8,
    duration: 600,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })

  scene.tweens.add({
    targets: shard,
    angle: 720,
    duration: 1400,
    ease: 'Linear',
    repeat: -1,
  })

  scene.tweens.add({
    targets: shard,
    scale: 1.18,
    duration: 900,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })

  return shard as Phaser.GameObjects.Arc & Phaser.Physics.Arcade.Body
}
