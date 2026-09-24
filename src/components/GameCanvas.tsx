'use client'

import { useEffect, useRef, useState } from 'react'

import { Hud } from './Hud'
import { LoseScreen } from './LoseScreen'
import { ResultScreen } from './ResultScreen'
import { StartScreen } from './StartScreen'

type GameCommandType = 'pause' | 'resume' | 'restart'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const eventTargetRef = useRef<EventTarget>(new EventTarget())
  const gameFactoryRef = useRef<
    ((parent: HTMLElement, callbacks?: {
      onScoreChange?: (score: number) => void
      onRunComplete?: (score: number) => void
      onRunLose?: (score: number) => void
      eventTarget?: EventTarget
    }) => { destroy: (removeCanvas: boolean) => void }) | null
  >(null)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [lost, setLost] = useState(false)
  const [score, setScore] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [isPaused, setIsPaused] = useState(false)
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null)

  const sendGameCommand = (type: GameCommandType) => {
    eventTargetRef.current.dispatchEvent(
      new CustomEvent('game-command', {
        detail: { type },
      }),
    )
  }

  const createGameInstance = () => {
    if (!containerRef.current || !gameFactoryRef.current) {
      return
    }

    gameRef.current?.destroy(true)
    gameRef.current = gameFactoryRef.current(containerRef.current, {
      eventTarget: eventTargetRef.current,
      onScoreChange: (nextScore) => setScore(nextScore),
      onRunComplete: () => setFinished(true),
      onRunLose: () => setLost(true),
    })
  }

  useEffect(() => {
    let cancelled = false
    const eventTarget = eventTargetRef.current

    const handleShardCollected = (event: Event) => {
      const detail = (event as CustomEvent<{ score?: number }>).detail
      if (typeof detail?.score === 'number') {
        setScore(detail.score)
      }
    }

    const handleTimerChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ timeRemaining?: number }>).detail
      if (typeof detail?.timeRemaining === 'number') {
        setTimeRemaining(detail.timeRemaining)
      }
    }

    const handleGameWon = () => {
      setFinished(true)
      setLost(false)
      setIsPaused(false)
    }

    const handleGameLost = () => {
      setLost(true)
      setFinished(false)
      setIsPaused(false)
    }

    eventTarget.addEventListener('shard-collected', handleShardCollected)
    eventTarget.addEventListener('timer-changed', handleTimerChanged)
    eventTarget.addEventListener('game-won', handleGameWon)
    eventTarget.addEventListener('game-lost', handleGameLost)

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
      eventTarget.removeEventListener('shard-collected', handleShardCollected)
      eventTarget.removeEventListener('timer-changed', handleTimerChanged)
      eventTarget.removeEventListener('game-won', handleGameWon)
      eventTarget.removeEventListener('game-lost', handleGameLost)
      gameRef.current?.destroy(true)
    }
  }, [])

  const startRun = () => {
    setScore(0)
    setTimeRemaining(60)
    setFinished(false)
    setLost(false)
    setIsPaused(false)
    setStarted(true)
    createGameInstance()
  }

  const restartGame = () => {
    sendGameCommand('resume')
    startRun()
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-violet-300/20 bg-[#1e1633]">
      <div
        ref={containerRef}
        id="game-container"
        className="relative min-h-135 w-full [&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full"
      />

      {started && !finished && !lost && (
        <Hud
          score={score}
          timer={timeRemaining}
          isPaused={isPaused}
          onPause={() => {
            setIsPaused(true)
            sendGameCommand('pause')
          }}
          onResume={() => {
            setIsPaused(false)
            sendGameCommand('resume')
          }}
          onRestart={restartGame}
        />
      )}
      {!started && <StartScreen onStart={startRun} />}
      {finished && <ResultScreen score={score} onRestart={restartGame} />}
      {lost && !finished && <LoseScreen score={score} onRestart={restartGame} />}
    </div>
  )
}
