# Pocket Relic Run

Pocket Relic Run is a small Phaser-based stealth maze game built with Next.js and the T3 stack. You play as a runner trying to collect relic shards, reach the exit, and avoid a roaming guardian that patrols and chases through the maze.

## Gameplay

- Move with WASD or the arrow keys.
- Collect enough relic shards to unlock the exit.
- Reach the glowing exit portal to win.
- Avoid the guardian and the countdown timer, or you lose.

## Project structure

- `src/game/` - Phaser scene, gameplay logic, and arena setup
- `src/components/` - HUD, start screen, and result overlays
- `src/app/` - Next.js app shell and route layout
- `src/server/` and `src/trpc/` - server and tRPC configuration

## Tech stack

- Next.js
- TypeScript
- Phaser 4
- Tailwind CSS
- tRPC

## Development

Install dependencies:

npm install

Start the app in development mode:

npm run dev

Build for production:

npm run build

Run a type check:

npm run typecheck

## Notes

This project is intentionally lightweight and focused on a single playable loop, with the game state and UI coordinated between the Phaser scene and the surrounding Next.js app.
