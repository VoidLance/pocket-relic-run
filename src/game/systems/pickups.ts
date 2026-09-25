import Phaser from 'phaser'

export function createShard(scene: Phaser.Scene, x: number, y: number) {
  const glow = scene.add.sprite(x, y, 'relic-sprite', 0)
  glow.setDepth(4)
  glow.setScale(1.55)
  glow.setAlpha(0.38)
  glow.setBlendMode(Phaser.BlendModes.ADD)
  glow.setTint(0x7fe7ff)

  const shard = scene.add.sprite(x, y, 'relic-sprite', 0)
  shard.setDepth(5)
  shard.setScale(1.2)
  shard.setAlpha(1)
  shard.setBlendMode(Phaser.BlendModes.ADD)
  scene.physics.add.existing(shard, true)
  shard.setData('glow', glow)

  if (!scene.anims.exists('relic-glow')) {
    scene.anims.create({
      key: 'relic-glow',
      frames: scene.anims.generateFrameNumbers('relic-sprite', { start: 0, end: 4 }),
      frameRate: 10,
      repeat: -1,
    })
  }

  glow.play('relic-glow')
  shard.play('relic-glow')

  scene.tweens.add({
    targets: glow,
    y: y - 10,
    duration: 700,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })

  scene.tweens.add({
    targets: glow,
    scaleX: 1.9,
    scaleY: 1.65,
    duration: 900,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })

  scene.tweens.add({
    targets: glow,
    alpha: 0.6,
    duration: 600,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })

  scene.tweens.add({
    targets: shard,
    y: y - 12,
    duration: 650,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })

  scene.tweens.add({
    targets: shard,
    scaleX: 1.45,
    scaleY: 1.2,
    duration: 700,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })

  scene.tweens.add({
    targets: shard,
    alpha: 0.9,
    duration: 500,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })

  return shard as Phaser.GameObjects.Sprite & Phaser.Physics.Arcade.Body
}
