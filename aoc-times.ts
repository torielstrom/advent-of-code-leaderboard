// Run with: npx tsx aoc-times.ts [leaderboard-url or leaderboard-id view-key]
// Examples:
//   npx tsx aoc-times.ts https://adventofcode.com/2025/leaderboard/private/view/12345?view_key=abc123
//   npx tsx aoc-times.ts 12345 abc123
//   ADVENT_OF_CODE_LEADERBOARD_ID=12345 ADVENT_OF_CODE_VIEW_KEY=abc123 npx tsx aoc-times.ts

function parseArgs(): {leaderboardId: string; viewKey: string} {
  const args = process.argv.slice(2)

  // Check for URL argument
  if (args[0]?.includes('adventofcode.com')) {
    const url = new URL(args[0])
    const match = url.pathname.match(/\/leaderboard\/private\/view\/(\d+)/)
    const leaderboardId = match?.[1]
    const viewKey = url.searchParams.get('view_key')

    if (!leaderboardId || !viewKey) {
      console.error('Invalid URL. Expected format:')
      console.error('  https://adventofcode.com/2025/leaderboard/private/view/12345?view_key=abc123')
      process.exit(1)
    }
    return {leaderboardId, viewKey}
  }

  // Check for ID + key arguments
  if (args[0] && args[1]) {
    return {leaderboardId: args[0], viewKey: args[1]}
  }

  // Fall back to environment variables
  const leaderboardId = process.env.ADVENT_OF_CODE_LEADERBOARD_ID
  const viewKey = process.env.ADVENT_OF_CODE_VIEW_KEY

  if (!leaderboardId || !viewKey) {
    console.error('Usage:')
    console.error('  npx tsx aoc-times.ts <leaderboard-url>')
    console.error('  npx tsx aoc-times.ts <leaderboard-id> <view-key>')
    console.error('')
    console.error('Or set environment variables:')
    console.error('  ADVENT_OF_CODE_LEADERBOARD_ID=12345')
    console.error('  ADVENT_OF_CODE_VIEW_KEY=abc123')
    console.error('')
    console.error('Find your URL at: https://adventofcode.com/2025/leaderboard/private')
    process.exit(1)
  }

  return {leaderboardId, viewKey}
}

const {leaderboardId: LEADERBOARD_ID, viewKey: VIEW_KEY} = parseArgs()

// Day 1 unlocks at midnight EST = 05:00 UTC on Dec 1, 2025
// Dec 1, 2025 05:00:00 UTC = 1764565200
const DAY_1_UNLOCK = 1764565200
const SECONDS_PER_DAY = 86400

interface CompletionDayLevel {
  [day: string]: {
    '1'?: {get_star_ts: number}
    '2'?: {get_star_ts: number}
  }
}

interface Member {
  id: number
  name: string
  stars: number
  local_score: number
  last_star_ts: number
  completion_day_level: CompletionDayLevel
}

interface LeaderboardData {
  event: string
  owner_id: number
  members: {[id: string]: Member}
  num_days: number
  day1_ts: number
}

function formatDuration(seconds: number): string {
  if (seconds < 0) return 'N/A'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`
  } else if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`
  } else if (mins > 0) {
    return `${mins}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

function getPuzzleUnlock(day: number): number {
  return DAY_1_UNLOCK + (day - 1) * SECONDS_PER_DAY
}

async function main() {
  console.log('Fetching Advent of Code 2025 leaderboard...\n')

  const response = await fetch(
    `https://adventofcode.com/2025/leaderboard/private/view/${LEADERBOARD_ID}.json?view_key=${VIEW_KEY}`,
    {
      headers: {
        'User-Agent': 'Depot Advent of Code Leaderboard (contact@depot.dev)',
      },
    },
  )

  if (!response.ok) {
    console.error(`Failed to fetch: ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  const data: LeaderboardData = await response.json()

  // Sort members by score
  const members = Object.values(data.members).sort((a, b) => {
    if (b.local_score !== a.local_score) return b.local_score - a.local_score
    if (b.stars !== a.stars) return b.stars - a.stars
    return a.last_star_ts - b.last_star_ts
  })

  console.log(`Advent of Code ${data.event} · ${members.length} members · ${data.num_days} days\n`)

  // Build time data for all members and days
  interface MemberStats {
    name: string
    score: number
    stars: number
    times: Map<number, {part1: number | null; part2: number | null}>
  }

  const memberStats: MemberStats[] = []

  for (const member of members) {
    const name = member.name || `Anonymous #${member.id}`
    const times = new Map<number, {part1: number | null; part2: number | null}>()

    for (let day = 1; day <= data.num_days; day++) {
      const unlock = getPuzzleUnlock(day)
      const dayData = member.completion_day_level[day.toString()]

      if (dayData) {
        const part1Ts = dayData['1']?.get_star_ts
        const part2Ts = dayData['2']?.get_star_ts
        times.set(day, {
          part1: part1Ts ? part1Ts - unlock : null,
          part2: part2Ts ? part2Ts - unlock : null,
        })
      }
    }

    memberStats.push({name, score: member.local_score, stars: member.stars, times})
  }

  // Calculate averages per day
  const dayAverages = new Map<number, {avgP1: number | null; avgP2: number | null}>()
  for (let day = 1; day <= data.num_days; day++) {
    let p1Total = 0,
      p1Count = 0,
      p2Total = 0,
      p2Count = 0
    for (const m of memberStats) {
      const t = m.times.get(day)
      if (t?.part1 != null) {
        p1Total += t.part1
        p1Count++
      }
      if (t?.part2 != null) {
        p2Total += t.part2
        p2Count++
      }
    }
    dayAverages.set(day, {
      avgP1: p1Count > 0 ? Math.round(p1Total / p1Count) : null,
      avgP2: p2Count > 0 ? Math.round(p2Total / p2Count) : null,
    })
  }

  // ============================================================
  // LEADERBOARD TABLE (ranked by score)
  // ============================================================
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                    LEADERBOARD                             ║')
  console.log('╠══════╦══════════════════════════╦═════════╦════════════════╣')
  console.log('║ Rank ║ Name                     ║  Score  ║     Stars      ║')
  console.log('╠══════╬══════════════════════════╬═════════╬════════════════╣')

  for (let i = 0; i < memberStats.length; i++) {
    const m = memberStats[i]
    const rank = (i + 1).toString().padStart(4)
    const name = m.name.slice(0, 24).padEnd(24)
    const score = m.score.toString().padStart(7)
    const starsDisplay = ('★'.repeat(m.stars) + '☆'.repeat(data.num_days * 2 - m.stars)).slice(0, 14)
    console.log(`║ ${rank} ║ ${name} ║ ${score} ║ ${starsDisplay} ║`)
  }

  console.log('╚══════╩══════════════════════════╩═════════╩════════════════╝')

  // ============================================================
  // DAILY BREAKDOWN TABLES
  // ============================================================
  for (let day = 1; day <= data.num_days; day++) {
    const avg = dayAverages.get(day)!

    // Get completions for this day, sorted by part 1 time
    const dayCompletions = memberStats
      .filter((m) => m.times.get(day)?.part1 != null)
      .map((m) => ({
        name: m.name,
        p1: m.times.get(day)!.part1!,
        p2: m.times.get(day)!.part2,
      }))
      .sort((a, b) => a.p1 - b.p1)

    if (dayCompletions.length === 0) continue

    console.log('')
    console.log(`┌─────────────────────────────────────────────────────────────┐`)
    console.log(`│  DAY ${day.toString().padEnd(54)}│`)
    console.log(`├──────┬──────────────────────────┬─────────────┬─────────────┤`)
    console.log(`│ Rank │ Name                     │   Part 1    │   Part 2    │`)
    console.log(`├──────┼──────────────────────────┼─────────────┼─────────────┤`)

    for (let i = 0; i < dayCompletions.length; i++) {
      const c = dayCompletions[i]
      const rank = (i + 1).toString().padStart(4)
      const name = c.name.slice(0, 24).padEnd(24)
      const p1 = formatDuration(c.p1).padStart(11)
      const p2 = c.p2 != null ? formatDuration(c.p2).padStart(11) : '-'.padStart(11)
      console.log(`│ ${rank} │ ${name} │ ${p1} │ ${p2} │`)
    }

    console.log(`├──────┴──────────────────────────┼─────────────┼─────────────┤`)
    const avgP1 = avg.avgP1 != null ? formatDuration(avg.avgP1).padStart(11) : '-'.padStart(11)
    const avgP2 = avg.avgP2 != null ? formatDuration(avg.avgP2).padStart(11) : '-'.padStart(11)
    console.log(`│ AVERAGE                         │ ${avgP1} │ ${avgP2} │`)
    console.log(`└─────────────────────────────────┴─────────────┴─────────────┘`)
  }
}

main().catch(console.error)
