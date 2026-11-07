export const WORKSTATIONS = [
  'Signal Analyst',
  'Receiver Technician',
  'Archivist',
  'Cryptographer',
] as const

export type Workstation = (typeof WORKSTATIONS)[number]
export type Allegiance = 'Crew' | 'Saboteur'

export interface AssignedPlayer {
  name: string
  workstation: Workstation
  allegiance: Allegiance
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const sample = random()

    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new RangeError('The random generator must return values in [0, 1).')
    }

    const swapIndex = Math.floor(sample * (index + 1))
    const currentItem = shuffled[index]
    const swapItem = shuffled[swapIndex]

    if (currentItem === undefined || swapItem === undefined) {
      throw new RangeError('The player assignments are incomplete.')
    }

    shuffled[index] = swapItem
    shuffled[swapIndex] = currentItem
  }

  return shuffled
}

export function assignPlayers(
  playerNames: readonly string[],
  random: () => number = Math.random,
): AssignedPlayer[] {
  if (
    !Array.isArray(playerNames) ||
    playerNames.length !== 4 ||
    playerNames.some(
      (name) => typeof name !== 'string' || name.trim().length === 0,
    )
  ) {
    throw new RangeError('Exactly four non-empty player names are required.')
  }

  const workstations = shuffle(WORKSTATIONS, random)
  const allegiances = shuffle<Allegiance>(
    ['Saboteur', 'Crew', 'Crew', 'Crew'],
    random,
  )

  return playerNames.map((name, index) => {
    const workstation = workstations[index]
    const allegiance = allegiances[index]

    if (!workstation || !allegiance) {
      throw new RangeError('The player assignments are incomplete.')
    }

    return {
      name: name.trim(),
      workstation,
      allegiance,
    }
  })
}
