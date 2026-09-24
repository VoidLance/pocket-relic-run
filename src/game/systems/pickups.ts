import type Phaser from 'phaser'

export function createShard(scene: Phaser.Scene, x: number, y: number) {
  const shard = scene.add.circle(x, y, 10, 0xffd54a)
  scene.physics.add.existing(shard, true)
  return shard as Phaser.GameObjects.Arc & Phaser.Physics.Arcade.Body
}
