type ResultScreenProps = {
  relics?: number
  timeRemaining?: number
  onRestart: () => void
}

export function ResultScreen({ relics = 0, timeRemaining = 0, onRestart }: ResultScreenProps) {
  const timeBonus = Math.max(0, Math.ceil(timeRemaining))
  const displayScore = relics + timeBonus

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#11101a]/65 backdrop-blur-[2px] animate-[fadeIn_0.25s_ease-out]">
      <div className="pointer-events-auto rounded-2xl border border-violet-300/20 bg-[#1e1633]/90 p-8 text-center shadow-2xl shadow-violet-950/40 animate-[popIn_0.32s_cubic-bezier(0.16,1,0.3,1)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">
          Run complete
        </p>
        <h2 className="mt-4 text-3xl font-black text-white">Relic shards recovered</h2>
        <p className="mt-2 text-sm uppercase tracking-[0.2em] text-violet-200/80">
          {relics} relics + {timeBonus}s time = {displayScore} score
        </p>
        <p className="mt-3 text-4xl font-black text-amber-300">{displayScore}</p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          Play again
        </button>
      </div>
    </div>
  )
}
