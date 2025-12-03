# advent-of-code-leaderboard

CLI tool to display solve times and rankings for Advent of Code private leaderboards.

## Setup

```bash
npm install
```

## Usage

The easiest way is to pass your private leaderboard URL directly:

```bash
npx tsx aoc-times.ts "https://adventofcode.com/2025/leaderboard/private/view/12345?view_key=abc123"
```

You can find this URL by going to your [private leaderboard](https://adventofcode.com/2025/leaderboard/private) and copying the "View" link.

### Alternative: Pass ID and key separately

```bash
npx tsx aoc-times.ts 12345 abc123
```

### Alternative: Environment variables

```bash
export ADVENT_OF_CODE_LEADERBOARD_ID=12345
export ADVENT_OF_CODE_VIEW_KEY=abc123
npx tsx aoc-times.ts
```

## Output

The script displays:

1. **Leaderboard** - Stack-ranked table with rank, name, score, and star progress
2. **Daily Breakdown** - Per-day tables ranked by Part 1 completion time, with averages at the bottom

## License

MIT
