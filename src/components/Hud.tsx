type HudProps = {
  score: number
  label?: string
}

export function Hud({ score, label = 'Relic shards' }: HudProps) {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-center gap-3 rounded-full border border-violet-300/30 bg-[#1e1633]/80 px-4 py-2 shadow-lg shadow-black/25 backdrop-blur-sm">
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
  )
}
