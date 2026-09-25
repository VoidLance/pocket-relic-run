import Phaser from 'phaser'

import { createShard } from '../systems/pickups'

const levelOneArena = {
  width: 960,
  height: 540,
  background: '#1e1633',
  playerX: 70,
  playerY: 470,
  moveSpeed: 180,
  timerSeconds: 60,
  guardianStart: { x: 840, y: 90 },
  exit: { x: 870, y: 70 },
  wallSegments: [
    { x: 180, y: 110, width: 190, height: 18 },
    { x: 430, y: 110, width: 210, height: 18 },
    { x: 720, y: 110, width: 180, height: 18 },
    { x: 290, y: 200, width: 18, height: 150 },
    { x: 500, y: 200, width: 18, height: 180 },
    { x: 670, y: 200, width: 18, height: 180 },
    { x: 160, y: 300, width: 260, height: 18 },
    { x: 420, y: 300, width: 210, height: 18 },
    { x: 690, y: 300, width: 210, height: 18 },
    { x: 220, y: 430, width: 18, height: 110 },
    { x: 420, y: 430, width: 18, height: 110 },
    { x: 760, y: 430, width: 18, height: 110 },
    { x: 140, y: 470, width: 200, height: 18 },
    { x: 520, y: 470, width: 180, height: 18 },
    { x: 800, y: 470, width: 120, height: 18 },
  ],
  shardSpawns: [
    { x: 220, y: 180 },
    { x: 770, y: 240 },
    { x: 650, y: 450 },
    { x: 400, y: 360 },
  ],
  shardRadius: 10,
} as const

const levelTwoArena = {
  width: 960,
  height: 540,
  background: '#1e1633',
  playerX: 70,
  playerY: 470,
  moveSpeed: 190,
  timerSeconds: 70,
  guardianStart: { x: 820, y: 110 },
  exit: { x: 870, y: 70 },
  wallSegments: [
    { x: 200, y: 120, width: 170, height: 18 },
    { x: 480, y: 120, width: 200, height: 18 },
    { x: 760, y: 120, width: 140, height: 18 },
    { x: 260, y: 210, width: 18, height: 180 },
    { x: 520, y: 210, width: 18, height: 210 },
    { x: 710, y: 210, width: 18, height: 180 },
    { x: 150, y: 300, width: 260, height: 18 },
    { x: 420, y: 300, width: 210, height: 18 },
    { x: 690, y: 300, width: 210, height: 18 },
    { x: 180, y: 430, width: 18, height: 100 },
    { x: 420, y: 430, width: 18, height: 100 },
    { x: 760, y: 430, width: 18, height: 100 },
    { x: 120, y: 470, width: 220, height: 18 },
    { x: 510, y: 470, width: 190, height: 18 },
    { x: 790, y: 470, width: 130, height: 18 },
  ],
  shardSpawns: [
    { x: 220, y: 180 },
    { x: 770, y: 240 },
    { x: 310, y: 460 },
    { x: 640, y: 430 },
    { x: 420, y: 360 },
  ],
  shardRadius: 10,
} as const

const levelConfigs = [levelOneArena, levelTwoArena] as const

type GameEventName = 'shard-collected' | 'timer-changed' | 'game-won' | 'game-lost'

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite
  private guardian!: Phaser.GameObjects.Rectangle
  private secondGuardian?: Phaser.GameObjects.Rectangle
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: {
    A: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    W: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
  }
  private exit!: Phaser.GameObjects.Rectangle
  private shards: Array<Phaser.GameObjects.Arc & Phaser.Physics.Arcade.Body> = []
  private score = 0
  private timeRemaining: number = this.arenaConfig.timerSeconds
  private lastEmittedTimer = Math.ceil(this.arenaConfig.timerSeconds)
  private lastSafePlayerPosition: { x: number; y: number } = {
    x: this.arenaConfig.playerX,
    y: this.arenaConfig.playerY,
  }
  private lastMoveDirection = { x: 1, y: 0 }
  private dashKey!: Phaser.Input.Keyboard.Key
  private dashCooldownRemaining = 0
  private dashTimer = 0
  private readonly dashCooldownMs = 420
  private readonly dashDurationMs = 130
  private readonly dashStrength = 520
  private isRecoveringFromImpact = false
  private impactRecoveryMs = 0
  private isSimulationPaused = false
  private currentLevelIndex = 0
  private cumulativeScore = 0
  private readonly maxScore = levelConfigs[0].shardSpawns.length
  private readonly requiredShards = 3
  private readonly timeBonusMultiplier = 1
  private isGameOver = false
  private get arenaConfig() {
    return levelConfigs[this.currentLevelIndex] ?? levelConfigs[0]
  }
  private soundContext?: AudioContext
  private readonly callbacks: {
    onScoreChange?: (score: number) => void
    onRunComplete?: (score: number) => void
    onRunLose?: (score: number) => void
    eventTarget?: EventTarget
  }

  constructor(
    callbacks: { onScoreChange?: (score: number) => void; onRunComplete?: (score: number) => void; onRunLose?: (score: number) => void; eventTarget?: EventTarget } = {},
    initialLevelIndex = 0,
    initialCumulativeScore = 0,
  ) {
    super('GameScene')
    this.callbacks = callbacks
    this.currentLevelIndex = initialLevelIndex
    this.cumulativeScore = initialCumulativeScore
  }

  private getCurrentRequiredShards() {
    return this.currentLevelIndex === 0 ? 3 : 5
  }

  private emitGameEvent(eventName: GameEventName, detail: Record<string, number | boolean | string>) {
    this.game.events.emit(eventName, detail)
    this.callbacks.eventTarget?.dispatchEvent(new CustomEvent(eventName, { detail }))
  }

  private readonly handleCommand = (event: Event) => {
    const detail = (event as CustomEvent<{ type?: 'pause' | 'resume' }>).detail

    if (!detail || typeof detail.type !== 'string') {
      return
    }

    if (detail.type === 'pause') {
      this.pauseGame()
    }

    if (detail.type === 'resume') {
      this.resumeGame()
    }
  }

  public pauseGame() {
    if (this.isGameOver) {
      return
    }

    this.isSimulationPaused = true
    this.physics?.world?.pause()
    this.player?.anims?.pause()
  }

  public resumeGame() {
    if (this.isGameOver) {
      return
    }

    this.isSimulationPaused = false
    this.physics?.world?.resume()
    this.player?.anims?.resume()
  }

  private createWallMaze() {
    this.walls = this.physics.add.staticGroup()

    for (const wallConfig of this.arenaConfig.wallSegments) {
      const wall = this.add.rectangle(
        wallConfig.x,
        wallConfig.y,
        wallConfig.width,
        wallConfig.height,
        0x35284f,
      )

      this.physics.add.existing(wall, true)
      this.walls.add(wall)
    }
  }

  private getSafeSpawnPosition(x: number, y: number, width: number, height: number, minDistanceFromPlayer = 0) {
    const candidate = { x, y }
    const testBody = this.add.rectangle(candidate.x, candidate.y, width, height)
    this.physics.add.existing(testBody)

    const overlapsWall = this.physics.overlap(testBody, this.walls)
    const playerDistance = this.player ? Math.hypot(candidate.x - this.player.x, candidate.y - this.player.y) : Number.POSITIVE_INFINITY
    const overlapsPlayer = minDistanceFromPlayer > 0 && playerDistance < minDistanceFromPlayer
    testBody.destroy()

    if (!overlapsWall && !overlapsPlayer) {
      return candidate
    }

    const searchRadius = 28
    const searchSteps = 12

    for (let offset = searchRadius; offset <= 220; offset += searchRadius) {
      for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2) / searchSteps) {
        const nextX = x + Math.cos(angle) * offset
        const nextY = y + Math.sin(angle) * offset
        const probe = this.add.rectangle(nextX, nextY, width, height)
        this.physics.add.existing(probe)

        const probeOverlapsWall = this.physics.overlap(probe, this.walls)
        const probePlayerDistance = this.player ? Math.hypot(nextX - this.player.x, nextY - this.player.y) : Number.POSITIVE_INFINITY
        const probeOverlapsPlayer = minDistanceFromPlayer > 0 && probePlayerDistance < minDistanceFromPlayer
        probe.destroy()

        if (!probeOverlapsWall && !probeOverlapsPlayer) {
          return { x: nextX, y: nextY }
        }
      }
    }

    return { x: 80, y: 80 }
  }

  private finishRun() {
    this.isGameOver = true
    this.physics.pause()
    this.scene.pause()
  }

  private ensureAudio() {
    if (typeof window === 'undefined') {
      return
    }

    const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) {
      return
    }

    this.soundContext ??= new AudioCtor()

    if (this.soundContext.state === 'suspended') {
      void this.soundContext.resume().catch(() => undefined)
    }
  }

  private playTone(frequency: number, duration = 0.08, volume = 0.04, type: OscillatorType = 'sine') {
    if (!this.soundContext) {
      return
    }

    const oscillator = this.soundContext.createOscillator()
    const gain = this.soundContext.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency

    gain.gain.value = volume
    gain.gain.setValueAtTime(volume, this.soundContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, this.soundContext.currentTime + duration)

    oscillator.connect(gain)
    gain.connect(this.soundContext.destination)

    oscillator.start()
    oscillator.stop(this.soundContext.currentTime + duration)
  }

  private triggerDash() {
    if (this.isGameOver || this.dashCooldownRemaining > 0) {
      return
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined
    if (!body) {
      return
    }

    this.ensureAudio()
    this.dashCooldownRemaining = this.dashCooldownMs
    this.dashTimer = this.dashDurationMs
    this.playTone(330, 0.08, 0.03, 'square')
    body.setVelocity(this.lastMoveDirection.x * this.dashStrength, this.lastMoveDirection.y * this.dashStrength)
  }

  private triggerPlayerImpact(kind: 'wall' | 'guardian' = 'wall') {
    if (this.isRecoveringFromImpact) {
      return
    }

    if (kind !== 'wall') {
      this.ensureAudio()
      this.playTone(120, 0.09, 0.05, 'sawtooth')
    }
    this.isRecoveringFromImpact = true
    this.impactRecoveryMs = 150

    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined

    if (body) {
      body.stop()
      body.reset(this.lastSafePlayerPosition.x, this.lastSafePlayerPosition.y)
    } else {
      this.player.x = this.lastSafePlayerPosition.x
      this.player.y = this.lastSafePlayerPosition.y
    }

    if (kind === 'guardian') {
      this.tweens.killTweensOf(this.guardian)
      this.tweens.add({
        targets: this.guardian,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 110,
        yoyo: true,
        repeat: 0,
        ease: 'Back.easeOut',
      })
    }
  }

  private triggerLose(reason: 'guardian' | 'timeout' = 'guardian') {
    if (this.isGameOver) {
      return
    }

    this.ensureAudio()
    this.playTone(90, 0.22, 0.06, 'triangle')
    this.emitGameEvent('game-lost', {
      score: this.score,
      timeRemaining: this.timeRemaining,
      reason,
    })
    this.callbacks.onRunLose?.(this.score)
    this.finishRun()
  }

  private getRunScore() {
    const relicScore = this.score
    const timeBonus = Math.max(0, Math.ceil(this.timeRemaining)) * this.timeBonusMultiplier
    return relicScore + timeBonus
  }

  private triggerWin() {
    if (this.isGameOver) {
      return
    }

    this.ensureAudio()
    this.playTone(620, 0.12, 0.05, 'triangle')
    this.playTone(820, 0.18, 0.05, 'triangle')

    const levelScore = this.getRunScore()
    this.cumulativeScore += levelScore
    const isFinalLevel = this.currentLevelIndex >= levelConfigs.length - 1

    this.emitGameEvent('game-won', {
      score: levelScore,
      totalScore: this.cumulativeScore,
      relics: this.score,
      timeRemaining: this.timeRemaining,
      levelIndex: this.currentLevelIndex,
      isFinalLevel,
    })

    if (!isFinalLevel) {
      this.isGameOver = true
      this.physics.pause()
      this.scene.pause()
      this.callbacks.onRunComplete?.(this.cumulativeScore)
      return
    }

    this.callbacks.onRunComplete?.(this.cumulativeScore)
    this.finishRun()
  }

  private isBlocked(x: number, y: number, width: number, height: number) {
    const probeLeft = x - width / 2
    const probeRight = x + width / 2
    const probeTop = y - height / 2
    const probeBottom = y + height / 2
    const padding = 4

    for (const wall of this.walls.getChildren()) {
      const wallRect = wall as Phaser.GameObjects.Rectangle
      const bounds = wallRect.getBounds()
      const wallLeft = bounds.left - padding
      const wallRight = bounds.right + padding
      const wallTop = bounds.top - padding
      const wallBottom = bounds.bottom + padding

      const overlaps = probeRight > wallLeft && probeLeft < wallRight && probeBottom > wallTop && probeTop < wallBottom
      if (overlaps) {
        return true
      }
    }

    return false
  }

  private hasClearPath(dirX: number, dirY: number, samples = 8, stepSize = 18) {
    for (let i = 1; i <= samples; i += 1) {
      const probeX = this.guardian.x + dirX * i * stepSize
      const probeY = this.guardian.y + dirY * i * stepSize

      if (this.isBlocked(probeX, probeY, 26, 26)) {
        return false
      }
    }

    return true
  }

  private isWallBetweenGuardianAndPlayer() {
    const dx = this.player.x - this.guardian.x
    const dy = this.player.y - this.guardian.y
    const length = Math.hypot(dx, dy) || 1
    const dirX = dx / length
    const dirY = dy / length

    for (let distance = 18; distance <= length; distance += 18) {
      const probeX = this.guardian.x + dirX * distance
      const probeY = this.guardian.y + dirY * distance

      if (this.isBlocked(probeX, probeY, 26, 26)) {
        return true
      }
    }

    return false
  }

  private getBestFreeDirectionToward(targetX: number, targetY: number) {
    const dx = targetX - this.guardian.x
    const dy = targetY - this.guardian.y
    const directLength = Math.hypot(dx, dy) || 1
    const directVector = { x: dx / directLength, y: dy / directLength }

    const candidateAngles = [-180, -165, -150, -135, -120, -105, -90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165]
    let best = { x: directVector.x, y: directVector.y, score: -Infinity }

    for (const angle of candidateAngles) {
      const radians = Phaser.Math.DegToRad(angle)
      const x = Math.cos(radians)
      const y = Math.sin(radians)

      let clearDistance = 0
      let hitWall = false

      for (let distance = 18; distance <= 180; distance += 18) {
        const probeX = this.guardian.x + x * distance
        const probeY = this.guardian.y + y * distance

        if (this.isBlocked(probeX, probeY, 26, 26)) {
          hitWall = true
          break
        }

        clearDistance += 18
      }

      if (hitWall || clearDistance <= 0) {
        continue
      }

      const score = (x * directVector.x + y * directVector.y) * 30 + clearDistance
      if (score > best.score) {
        best = { x, y, score }
      }
    }

    if (best.score === -Infinity) {
      return directVector
    }

    const length = Math.hypot(best.x, best.y) || 1
    return { x: best.x / length, y: best.y / length }
  }

  private getRouteAroundWall() {
    const cellSize = 20
    const cols = Math.ceil(this.arenaConfig.width / cellSize)
    const rows = Math.ceil(this.arenaConfig.height / cellSize)

    const start = {
      x: Math.round(this.guardian.x / cellSize),
      y: Math.round(this.guardian.y / cellSize),
    }
    const goal = {
      x: Math.round(this.player.x / cellSize),
      y: Math.round(this.player.y / cellSize),
    }

    const queue: Array<{ x: number; y: number }> = [start]
    const cameFrom = new Map<string, string | null>()
    cameFrom.set(`${start.x},${start.y}`, null)

    const isOpen = (cellX: number, cellY: number) => {
      if (cellX < 0 || cellY < 0 || cellX >= cols || cellY >= rows) {
        return false
      }

      const centerX = cellX * cellSize + cellSize / 2
      const centerY = cellY * cellSize + cellSize / 2
      return !this.isBlocked(centerX, centerY, 26, 26)
    }

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.x === goal.x && current.y === goal.y) {
        break
      }

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
        { x: current.x + 1, y: current.y + 1 },
        { x: current.x + 1, y: current.y - 1 },
        { x: current.x - 1, y: current.y + 1 },
        { x: current.x - 1, y: current.y - 1 },
      ]

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`
        if (cameFrom.has(key) || !isOpen(neighbor.x, neighbor.y)) {
          continue
        }

        cameFrom.set(key, `${current.x},${current.y}`)
        queue.push(neighbor)
      }
    }

    const goalKey = `${goal.x},${goal.y}`
    if (!cameFrom.has(goalKey)) {
      return null
    }

    const path: Array<{ x: number; y: number }> = []
    let cursor: string | null = goalKey

    while (cursor) {
      const parts = cursor.split(',')
      const cellX = Number(parts[0])
      const cellY = Number(parts[1])

      if (!Number.isFinite(cellX) || !Number.isFinite(cellY)) {
        break
      }

      path.push({ x: cellX, y: cellY })
      cursor = cameFrom.get(cursor) ?? null
    }

    if (path.length === 0) {
      return null
    }

    return path.reverse()
  }

  private findGapDirection() {
    const path = this.getRouteAroundWall()
    if (path && path.length > 1) {
      const nextCell = path[1] ?? path[path.length - 1]
      if (nextCell) {
        const nextX = nextCell.x * 20 + 10
        const nextY = nextCell.y * 20 + 10
        const dx = nextX - this.guardian.x
        const dy = nextY - this.guardian.y
        const length = Math.hypot(dx, dy) || 1
        return { x: dx / length, y: dy / length }
      }
    }

    return this.getBestFreeDirectionToward(this.player.x, this.player.y)
  }

  private findBestChaseDirection() {
    const dx = this.player.x - this.guardian.x
    const dy = this.player.y - this.guardian.y
    const directLength = Math.hypot(dx, dy)
    const directVector = directLength > 0.0001 ? { x: dx / directLength, y: dy / directLength } : { x: 1, y: 0 }

    if (!this.isWallBetweenGuardianAndPlayer()) {
      return directVector
    }

    return this.findGapDirection()
  }

  preload() {
    this.load.spritesheet('player-sprite', '/Player.png', {
      frameWidth: 32,
      frameHeight: 32,
      margin: 0,
      spacing: 0,
    })
  }

  create() {
    const data = this.scene.settings.data as { levelIndex?: number } | undefined
    if (typeof data?.levelIndex === 'number' && data.levelIndex >= 0) {
      this.currentLevelIndex = Math.min(data.levelIndex, levelConfigs.length - 1)
    }

    this.isGameOver = false
    this.callbacks.eventTarget?.addEventListener('game-command', this.handleCommand)

    this.dashKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.ensureAudio()
      this.triggerDash()
    })

    if (this.physics.world.debugGraphic) {
      this.physics.world.debugGraphic.setVisible(false)
      this.physics.world.debugGraphic.clear()
    }

    this.isSimulationPaused = false

    this.createWallMaze()

    const playerSpawn = this.getSafeSpawnPosition(this.arenaConfig.playerX, this.arenaConfig.playerY, 24, 24)
    this.player = this.add.sprite(playerSpawn.x, playerSpawn.y, 'player-sprite', 0)
    this.player.setDisplaySize(24, 24)
    this.player.setOrigin(0.5)
    this.physics.add.existing(this.player)
    this.lastSafePlayerPosition = { x: playerSpawn.x, y: playerSpawn.y }

    this.anims.create({
      key: 'player-run',
      frames: this.anims.generateFrameNumbers('player-sprite', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1,
    })

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 20)
    body.setOffset(6, 6)
    body.setCollideWorldBounds(true)
    this.player.play('player-run', true)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as {
      A: Phaser.Input.Keyboard.Key
      D: Phaser.Input.Keyboard.Key
      W: Phaser.Input.Keyboard.Key
      S: Phaser.Input.Keyboard.Key
    }

    this.physics.add.collider(this.player, this.walls, () => {
      this.triggerPlayerImpact('wall')
    })

    const guardianSpawn = this.getSafeSpawnPosition(this.arenaConfig.guardianStart.x, this.arenaConfig.guardianStart.y, 26, 26, 110)
    this.guardian = this.add.rectangle(guardianSpawn.x, guardianSpawn.y, 26, 26, 0xff3b30)
    this.physics.add.existing(this.guardian)
    const guardianBody = this.guardian.body as Phaser.Physics.Arcade.Body
    guardianBody.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, this.guardian, () => {
      this.triggerPlayerImpact('guardian')
      this.triggerLose()
    })
    this.physics.add.collider(this.guardian, this.walls, () => {
      this.triggerPlayerImpact('wall')
    })

    if (this.currentLevelIndex > 0) {
      const secondGuardianSpawn = this.getSafeSpawnPosition(700, 200, 26, 26, 130)
      this.secondGuardian = this.add.rectangle(secondGuardianSpawn.x, secondGuardianSpawn.y, 26, 26, 0xff7a59)
      this.physics.add.existing(this.secondGuardian)
      const secondGuardianBody = this.secondGuardian.body as Phaser.Physics.Arcade.Body
      secondGuardianBody.setCollideWorldBounds(true)
      this.physics.add.collider(this.player, this.secondGuardian, () => {
        this.triggerPlayerImpact('guardian')
        this.triggerLose()
      })
      this.physics.add.collider(this.secondGuardian, this.walls, () => {
        this.triggerPlayerImpact('wall')
      })
    }

    const exitX = this.arenaConfig.exit.x
    const exitY = this.arenaConfig.exit.y
    this.exit = this.add.rectangle(exitX, exitY, 36, 36, 0x6a5acd)
    this.physics.add.existing(this.exit, true)
    this.physics.add.overlap(this.player, this.exit, () => {
      if (this.score >= this.getCurrentRequiredShards()) {
        this.triggerWin()
      }
    })

    for (const shardPosition of this.arenaConfig.shardSpawns) {
      const shard = createShard(this, shardPosition.x, shardPosition.y)
      this.shards.push(shard)

      this.physics.add.overlap(this.player, shard, (_player, collectible) => {
        const activeShard = collectible as Phaser.GameObjects.Arc
        this.physics.world.disable(activeShard)
        this.tweens.killTweensOf(activeShard)

        this.tweens.add({
          targets: activeShard,
          alpha: 0,
          scale: 1.9,
          rotation: activeShard.rotation + Math.PI * 2,
          y: activeShard.y - 22,
          duration: 220,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            activeShard.destroy()
          },
        })

        this.ensureAudio()
        this.playTone(440, 0.08, 0.05, 'triangle')

        this.shards = this.shards.filter((item) => item !== shard)
        this.score += 1
        this.callbacks.onScoreChange?.(this.score)
        this.emitGameEvent('shard-collected', { score: this.score, total: this.maxScore })

        if (this.score >= this.getCurrentRequiredShards()) {
          this.exit.setFillStyle(0x41d17d)
          this.tweens.add({
            targets: this.exit,
            scale: { from: 1, to: 1.35 },
            duration: 300,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut',
          })
        }
      })
    }

    this.emitGameEvent('timer-changed', { timeRemaining: this.timeRemaining, totalTime: this.arenaConfig.timerSeconds })
    this.callbacks.onScoreChange?.(this.score)
  }

  shutdown() {
    this.callbacks.eventTarget?.removeEventListener('game-command', this.handleCommand)
  }

  update() {
    if (this.isRecoveringFromImpact) {
      this.impactRecoveryMs = Math.max(0, this.impactRecoveryMs - this.game.loop.delta)
      if (this.impactRecoveryMs === 0) {
        this.isRecoveringFromImpact = false
      }
    }

    if (this.dashCooldownRemaining > 0) {
      this.dashCooldownRemaining = Math.max(0, this.dashCooldownRemaining - this.game.loop.delta)
    }

    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - this.game.loop.delta)
    }

    if (this.isSimulationPaused || this.isGameOver) {
      return
    }

    this.timeRemaining = Math.max(0, this.timeRemaining - this.game.loop.delta / 1000)
    const nextTimerValue = Math.ceil(this.timeRemaining)

    if (nextTimerValue !== this.lastEmittedTimer) {
      this.lastEmittedTimer = nextTimerValue
      this.emitGameEvent('timer-changed', {
        timeRemaining: this.timeRemaining,
        totalTime: this.arenaConfig.timerSeconds,
      })
    }

    if (this.timeRemaining <= 0) {
      this.triggerLose('timeout')
      return
    }

    let x = 0
    let y = 0

    if (this.cursors.left.isDown || this.keys.A.isDown) x -= 1
    if (this.cursors.right.isDown || this.keys.D.isDown) x += 1
    if (this.cursors.up.isDown || this.keys.W.isDown) y -= 1
    if (this.cursors.down.isDown || this.keys.S.isDown) y += 1

    const length = Math.hypot(x, y) || 1
    const body = this.player.body as Phaser.Physics.Arcade.Body

    if (x !== 0 || y !== 0) {
      this.lastMoveDirection = {
        x: x / length,
        y: y / length,
      }
      this.player.play('player-run', true)
      this.player.setFlipX(this.lastMoveDirection.x < 0)
    } else {
      this.player.anims.stop()
      this.player.setFrame(0)
      this.player.setFlipX(false)
    }

    this.lastSafePlayerPosition = { x: this.player.x, y: this.player.y }

    const dashBoost = this.dashTimer > 0 ? 1 : 0
    const dashVelocityX = this.lastMoveDirection.x * this.dashStrength * dashBoost
    const dashVelocityY = this.lastMoveDirection.y * this.dashStrength * dashBoost
    body.setVelocity((x / length) * this.arenaConfig.moveSpeed + dashVelocityX, (y / length) * this.arenaConfig.moveSpeed + dashVelocityY)

    const guardianBody = this.guardian.body as Phaser.Physics.Arcade.Body
    const { x: chaseX, y: chaseY } = this.findBestChaseDirection()
    const chaseLength = Math.hypot(chaseX, chaseY)

    if (Math.hypot(this.player.x - this.guardian.x, this.player.y - this.guardian.y) < 150) {
      this.tweens.add({
        targets: this.guardian,
        scaleX: { from: 1, to: 1.16 },
        scaleY: { from: 1, to: 1.16 },
        duration: 120,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      })
    }

    if (this.secondGuardian) {
      const secondGuardianBody = this.secondGuardian.body as Phaser.Physics.Arcade.Body
      const secondDx = this.player.x - this.secondGuardian.x
      const secondDy = this.player.y - this.secondGuardian.y
      const secondLength = Math.hypot(secondDx, secondDy) || 1
      secondGuardianBody.setVelocity((secondDx / secondLength) * 100, (secondDy / secondLength) * 100)
    }

    if (chaseLength < 0.0001) {
      const dx = this.player.x - this.guardian.x
      const dy = this.player.y - this.guardian.y
      const fallbackLength = Math.hypot(dx, dy) || 1
      guardianBody.setVelocity((dx / fallbackLength) * 120, (dy / fallbackLength) * 120)
      return
    }

    guardianBody.setVelocity(chaseX * 120, chaseY * 120)
  }
}
