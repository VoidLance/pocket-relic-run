'use client'

import { useEffect, useRef, useState } from 'react'

import { api } from '~/trpc/react'

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
      eventTarget?: EventTarget
    }, initialLevelIndex?: number, initialCumulativeScore?: number) => Phaser.Game) | null
  >(null)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [lost, setLost] = useState(false)
  const [lostReason, setLostReason] = useState<'guardian' | 'timeout'>('guardian')
  const [score, setScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [completedRelics, setCompletedRelics] = useState(0)
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0)
  const [levelSummary, setLevelSummary] = useState<{
    score: number
    relics: number
    timeRemaining: number
    totalScore: number
    levelIndex: number
  } | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const gameRef = useRef<Phaser.Game | null>(null)
  const currentLevelIndexRef = useRef(0)
  const totalScoreRef = useRef(0)
  const scoreRef = useRef(0)
  const timeRemainingRef = useRef(60)
  const submitScoreRef = useRef<((input: { score: number }) => void) | null>(null)
  const utils = api.useUtils()
  const submitScore = api.game.submitScore.useMutation({
    onSuccess: (result) => {
      utils.game.getBest.setData(undefined, {
        bestScore: result.bestScore,
        recentRuns: result.recentRuns,
      })
    },
  })
  submitScoreRef.current = submitScore.mutate
  const { data: bestData } = api.game.getBest.useQuery()
  const bestScore = bestData?.bestScore ?? 0

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    timeRemainingRef.current = timeRemaining
  }, [timeRemaining])

  useEffect(() => {
    currentLevelIndexRef.current = currentLevelIndex
  }, [currentLevelIndex])

  useEffect(() => {
    totalScoreRef.current = totalScore
  }, [totalScore])

  const sendGameCommand = (type: GameCommandType) => {
    eventTargetRef.current.dispatchEvent(
      new CustomEvent('game-command', {
        detail: { type },
      }),
    )
  }

  const createGameInstance = (nextLevelIndex = 0, runningTotal = 0) => {
    if (!containerRef.current || !gameFactoryRef.current) {
      return
    }

    gameRef.current?.destroy(true)
    gameRef.current = gameFactoryRef.current(
      containerRef.current,
      {
        eventTarget: eventTargetRef.current,
        onScoreChange: (nextScore) => setScore(nextScore),
      },
      nextLevelIndex,
      runningTotal,
    )

    return gameRef.current?.scene?.getScene('GameScene') as
      | { pauseGame?: () => void; resumeGame?: () => void }
      | undefined
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

    const handleGameWon = (event: Event) => {
      const detail = (event as CustomEvent<{
        score?: number
        totalScore?: number
        relics?: number
        timeRemaining?: number
        levelIndex?: number
        isFinalLevel?: boolean
      }>).detail
      const nextScore = typeof detail?.score === 'number' ? detail.score : scoreRef.current
      const nextTimeRemaining = typeof detail?.timeRemaining === 'number' ? detail.timeRemaining : timeRemainingRef.current
      const nextTotalScore = typeof detail?.totalScore === 'number' ? detail.totalScore : totalScoreRef.current
      const levelIndex = typeof detail?.levelIndex === 'number' ? detail.levelIndex : currentLevelIndexRef.current
      const isFinalLevel = detail?.isFinalLevel === true

      setCompletedRelics(typeof detail?.relics === 'number' ? detail.relics : scoreRef.current)
      setTimeRemaining(nextTimeRemaining)
      setScore(nextScore)
      setTotalScore(nextTotalScore)
      setCurrentLevelIndex(levelIndex)

      if (!isFinalLevel) {
        gameRef.current?.destroy(true)
        gameRef.current = null
        setLevelSummary({
          score: nextScore,
          relics: typeof detail?.relics === 'number' ? detail.relics : scoreRef.current,
          timeRemaining: nextTimeRemaining,
          totalScore: nextTotalScore,
          levelIndex,
        })
        setFinished(false)
        setLost(false)
        setIsPaused(false)
        return
      }

      setLevelSummary(null)
      setFinished(true)
      setLost(false)
      setIsPaused(false)
      submitScoreRef.current?.({ score: nextTotalScore })
    }

    const handleGameLost = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: 'guardian' | 'timeout' }>).detail
      setLostReason(detail?.reason ?? 'guardian')
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
    scoreRef.current = 0
    setScore(0)
    setTotalScore(0)
    setTimeRemaining(60)
    setFinished(false)
    setLost(false)
    setLevelSummary(null)
    setLostReason('guardian')
    setCompletedRelics(0)
    setCurrentLevelIndex(0)
    timeRemainingRef.current = 60
    setIsPaused(false)
    setStarted(true)
    const scene = createGameInstance(0, 0)
    scene?.resumeGame?.()
  }

  const continueLevel = () => {
    const nextLevelIndex = (levelSummary?.levelIndex ?? currentLevelIndexRef.current) + 1
    setLevelSummary(null)
    setFinished(false)
    setLost(false)
    setIsPaused(false)
    setCurrentLevelIndex(nextLevelIndex)
    currentLevelIndexRef.current = nextLevelIndex
    createGameInstance(nextLevelIndex, totalScoreRef.current)
  }

  const restartGame = () => {
    startRun()
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-violet-300/20 bg-[#1e1633]">
      <div
        ref={containerRef}
        id="game-container"
        className="relative min-h-135 w-full [&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full"
      />

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-violet-300/30 bg-[#1e1633]/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 shadow-lg shadow-black/25 backdrop-blur-sm">
        Best: {bestScore}
      </div>

      {started && !finished && !lost && !levelSummary && (
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
      {levelSummary && (
        <ResultScreen
          relics={levelSummary.relics}
          timeRemaining={levelSummary.timeRemaining}
          totalScore={levelSummary.totalScore}
          title="Level complete"
          buttonLabel="Continue"
          onContinue={continueLevel}
        />
      )}
      {finished && (
        <ResultScreen
          relics={completedRelics}
          timeRemaining={timeRemaining}
          totalScore={totalScore}
          title="Run complete"
          buttonLabel="Play again"
          onRestart={restartGame}
        />
      )}
      {lost && !finished && <LoseScreen score={score} reason={lostReason} onRestart={restartGame} />}
    </div>
  )
}
