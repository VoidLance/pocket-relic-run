import Phaser from 'phaser'

import { arena } from '../data/arena'
import { createShard } from '../systems/pickups'

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private guardian!: Phaser.GameObjects.Rectangle
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: {
    A: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    W: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
  }
  private tipText!: Phaser.GameObjects.Text
  private shards: Array<Phaser.GameObjects.Arc & Phaser.Physics.Arcade.Body> = []
  private score = 0
  private readonly maxScore = arena.shardSpawns.length
  private readonly callbacks: {
    onScoreChange?: (score: number) => void
    onRunComplete?: (score: number) => void
    onRunLose?: (score: number) => void
  }

  constructor(callbacks: { onScoreChange?: (score: number) => void; onRunComplete?: (score: number) => void; onRunLose?: (score: number) => void } = {}) {
    super('GameScene')
    this.callbacks = callbacks
  }

  private createWallMaze() {
    this.walls = this.physics.add.staticGroup()

    for (const wallConfig of arena.wallSegments) {
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

  private getSafeSpawnPosition(x: number, y: number, width: number, height: number) {
    const candidate = { x, y }
    const testBody = this.add.rectangle(candidate.x, candidate.y, width, height)
    this.physics.add.existing(testBody)

    const overlapsWall = this.physics.overlap(testBody, this.walls)
    testBody.destroy()

    if (!overlapsWall) {
      return candidate
    }

    return { x: 80, y: 80 }
  }

  private finishRun() {
    this.physics.pause()
    this.scene.pause()
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
    const cols = Math.ceil(arena.width / cellSize)
    const rows = Math.ceil(arena.height / cellSize)

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

  create() {
    this.add.text(20, 20, 'Pocket Relic Run — Phaser is working', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    })

    this.tipText = this.add.text(
      20,
      52,
      'Tip: if D feels dead, disable Vimium or add D to its ignore list.',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#d8d0f0',
      },
    )

    this.time.delayedCall(20000, () => {
      this.tweens.add({
        targets: this.tipText,
        alpha: 0,
        duration: 800,
        onComplete: () => {
          this.tipText.destroy()
        },
      })
    })

    this.createWallMaze()

    const playerSpawn = this.getSafeSpawnPosition(arena.playerX, arena.playerY, 24, 24)
    this.player = this.add.rectangle(playerSpawn.x, playerSpawn.y, 24, 24, 0x4da6ff)
    this.physics.add.existing(this.player)

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.keys

    this.physics.add.collider(this.player, this.walls)

    const guardianSpawn = this.getSafeSpawnPosition(arena.guardianStart.x, arena.guardianStart.y, 26, 26)
    this.guardian = this.add.rectangle(guardianSpawn.x, guardianSpawn.y, 26, 26, 0xff3b30)
    this.physics.add.existing(this.guardian)
    const guardianBody = this.guardian.body as Phaser.Physics.Arcade.Body
    guardianBody.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, this.guardian, () => {
      this.callbacks.onRunLose?.(this.score)
      this.finishRun()
    })
    this.physics.add.collider(this.guardian, this.walls)

    for (const shardPosition of arena.shardSpawns) {
      const shard = createShard(this, shardPosition.x, shardPosition.y)
      this.shards.push(shard)

      this.physics.add.overlap(this.player, shard, (_player, collectible) => {
        const activeShard = collectible as Phaser.GameObjects.Arc
        activeShard.destroy()
        this.shards = this.shards.filter((item) => item !== shard)
        this.score += 1
        this.callbacks.onScoreChange?.(this.score)

        if (this.score >= this.maxScore) {
          this.callbacks.onRunComplete?.(this.score)
          this.finishRun()
        }
      })
    }

    this.callbacks.onScoreChange?.(this.score)
  }

  update() {
    if (this.physics.world.isPaused || this.scene.isPaused()) {
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

    body.setVelocity((x / length) * arena.moveSpeed, (y / length) * arena.moveSpeed)

    const guardianBody = this.guardian.body as Phaser.Physics.Arcade.Body
    const { x: chaseX, y: chaseY } = this.findBestChaseDirection()
    const chaseLength = Math.hypot(chaseX, chaseY)

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
