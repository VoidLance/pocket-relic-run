type HudProps = {
  score: number
  timer: number
  isPaused: boolean
  label?: string
  onPause: () => void
  onResume: () => void
  onRestart: () => void
}

export function Hud({ score, timer, isPaused, label = 'Relic shards', onPause, onResume, onRestart }: HudProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="pointer-events-auto absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2">
        <div className="rounded-full border border-violet-300/30 bg-[#1e1633]/80 px-2 py-1.5 shadow-lg shadow-black/25 backdrop-blur-sm">
          <button
            type="button"
            onClick={isPaused ? onResume : onPause}
            className="rounded-full border border-violet-300/30 bg-violet-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 transition hover:bg-violet-500/30"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>

        <div className="rounded-full border border-violet-300/30 bg-[#1e1633]/80 px-4 py-2 shadow-lg shadow-black/25 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-200">
              ⏱
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/80">
                Timer
              </span>
              <span className="text-lg font-bold text-white">{Math.max(0, Math.ceil(timer))}s</span>
            </div>
          </div>
        </div>

        <div className="rounded-full border border-red-300/30 bg-[#1e1633]/80 px-2 py-1.5 shadow-lg shadow-black/25 backdrop-blur-sm">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-full border border-red-300/30 bg-red-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100 transition hover:bg-red-500/25"
          >
            Restart
          </button>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-3 rounded-full border border-violet-300/30 bg-[#1e1633]/80 px-4 py-2 shadow-lg shadow-black/25 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-300/20 text-sm font-bold text-amber-300">
          ✦
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/80">
            {label}
          </span>
          <span className="text-lg font-bold text-white">{score}</span>
        </div>
      </div>
    </div>
  )
}
