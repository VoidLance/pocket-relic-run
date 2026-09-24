import { GameCanvas } from '../components/GameCanvas'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#11101a] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Pocket Relic Run
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Relic shard run
          </h1>
        </header>

        <GameCanvas />
      </section>
    </main>
  )
}
