type LoseScreenProps = {
  score: number
  reason?: 'guardian' | 'timeout'
  onRestart: () => void
}

export function LoseScreen({ score, reason = 'guardian', onRestart }: LoseScreenProps) {
  const title = reason === 'timeout'
    ? 'Time ran out'
    : 'The guardian caught you'

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#11101a]/65 backdrop-blur-[2px]">
      <div className="pointer-events-auto rounded-2xl border border-red-400/30 bg-[#1e1633]/90 p-8 text-center shadow-2xl shadow-red-950/30">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-300">
          Run failed
        </p>
        <h2 className="mt-4 text-3xl font-black text-white">{title}</h2>
        <p className="mt-3 text-4xl font-black text-amber-300">{score}</p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
