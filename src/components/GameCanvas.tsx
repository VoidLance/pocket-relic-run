'use client'

import { useEffect, useRef } from 'react'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let game: { destroy: (removeCanvas: boolean) => void } | null = null

    import('../game/main').then(({ createGame }) => {
      if (!cancelled && containerRef.current) {
        game = createGame(containerRef.current)
      }
    })

    return () => {
      cancelled = true
      game?.destroy(true)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      id="game-container"
      className="w-full overflow-hidden rounded-xl border border-violet-300/20 bg-[#1e1633] [&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full"
    />
  )
}
