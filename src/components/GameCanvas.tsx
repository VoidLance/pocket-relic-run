'use client'

import { useEffect, useRef, useState } from 'react'

import { Hud } from './Hud'
import { LoseScreen } from './LoseScreen'
import { ResultScreen } from './ResultScreen'
import { StartScreen } from './StartScreen'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameFactoryRef = useRef<
    ((parent: HTMLElement, callbacks?: {
      onScoreChange?: (score: number) => void
      onRunComplete?: (score: number) => void
      onRunLose?: (score: number) => void
    }) => { destroy: (removeCanvas: boolean) => void }) | null
  >(null)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [lost, setLost] = useState(false)
  const [score, setScore] = useState(0)
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null)

  const createGameInstance = () => {
    if (!containerRef.current || !gameFactoryRef.current) {
      return
    }

    gameRef.current?.destroy(true)
    gameRef.current = gameFactoryRef.current(containerRef.current, {
      onScoreChange: (nextScore) => setScore(nextScore),
      onRunComplete: () => setFinished(true),
      onRunLose: () => setLost(true),
    })
  }

  useEffect(() => {
    let cancelled = false

    import('../game/main').then(({ createGame }) => {
      if (cancelled) {
        return
      }

      gameFactoryRef.current = createGame
      if (containerRef.current) {
        createGameInstance()
      }
    }).catch((error: unknown) => {
      console.error('Failed to load the game', error)
    })

    return () => {
      cancelled = true
      gameRef.current?.destroy(true)
    }
  }, [])

  const startRun = () => {
    setScore(0)
    setFinished(false)
    setLost(false)
    setStarted(true)
    createGameInstance()
  }

  const restartGame = () => {
    startRun()
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-violet-300/20 bg-[#1e1633]">
      <div
        ref={containerRef}
        id="game-container"
        className="relative min-h-[540px] w-full [&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full"
      />

      {started && !finished && !lost && <Hud score={score} />}
      {!started && <StartScreen onStart={startRun} />}
      {finished && <ResultScreen score={score} onRestart={restartGame} />}
      {lost && !finished && <LoseScreen score={score} onRestart={restartGame} />}
    </div>
  )
}
