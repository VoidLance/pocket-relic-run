import type Phaser from 'phaser'

export function createShard(scene: Phaser.Scene, x: number, y: number) {
  const shard = scene.add.circle(x, y, 10, 0xffd54a)
  shard.setDepth(5)
  scene.physics.add.existing(shard, true)

  scene.tweens.add({
    targets: shard,
    angle: 360,
    duration: 1400,
    ease: 'Linear',
    loop: -1,
  })

  return shard as Phaser.GameObjects.Arc & Phaser.Physics.Arcade.Body
}
