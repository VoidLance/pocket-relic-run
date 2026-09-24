type StartScreenProps = {
  onStart: () => void
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#11101a]/60 backdrop-blur-[2px]">
      <div className="pointer-events-auto rounded-2xl border border-violet-300/20 bg-[#1e1633]/90 p-8 text-center shadow-2xl shadow-violet-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">
          Pocket Relic Run
        </p>
        <h2 className="mt-4 text-3xl font-black text-white">Collect the relic shards</h2>
        <p className="mt-3 max-w-md text-sm text-slate-300">
          Use A, D, W, S or the arrow keys to move through the arena and gather every glowing shard.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-6 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          Start run
        </button>
      </div>
    </div>
  )
}
