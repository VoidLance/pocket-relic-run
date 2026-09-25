import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'

type GameRun = {
  id: number
  score: number
  createdAt: string
}

const gameRuns: GameRun[] = []

const getBestScore = () =>
  gameRuns.reduce((best, run) => Math.max(best, run.score), 0)

export const gameRouter = createTRPCRouter({
  getBest: publicProcedure.query(() => {
    return {
      bestScore: getBestScore(),
      recentRuns: gameRuns.slice(-5).reverse(),
    }
  }),

  submitScore: publicProcedure
    .input(
      z.object({
        score: z.number().int().nonnegative(),
      }),
    )
    .mutation(({ input }) => {
      const run: GameRun = {
        id: gameRuns.length + 1,
        score: input.score,
        createdAt: new Date().toISOString(),
      }

      gameRuns.push(run)

      return {
        bestScore: getBestScore(),
        recentRuns: gameRuns.slice(-5).reverse(),
        run,
      }
    }),
})
