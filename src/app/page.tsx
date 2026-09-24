import { GameCanvas } from '../components/GameCanvas'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#11101a] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Pocket Relic Run
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Phaser MVP
          </h1>
          <p className="max-w-2xl text-slate-300">
            Next.js and Tailwind own this shell. Phaser owns the playable canvas.
          </p>
        </header>

        <GameCanvas />
      </section>
    </main>
  )
}
