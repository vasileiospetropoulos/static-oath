import { describe, expect, it } from 'vitest'
import { assignPlayers, WORKSTATIONS } from '../src/game/assignment'

const playerNames = ['Ari', 'Bea', 'Cal', 'Dev']
const invalidNameSets = [
  { names: [] },
  { names: ['Ari', 'Bea', 'Cal'] },
  { names: ['Ari', 'Bea', 'Cal', ''] },
  { names: ['Ari', 'Bea', 'Cal', '   '] },
]

function randomFrom(values: readonly number[]): () => number {
  let index = 0

  return () => {
    const value = values[index]
    index += 1

    if (value === undefined) {
      throw new Error('The test random sequence was exhausted.')
    }

    return value
  }
}

describe('player assignment', () => {
  it('assigns exactly one Saboteur, three Crew, and each workstation once', () => {
    const assignments = assignPlayers(playerNames, () => 0.4)

    expect(assignments).toHaveLength(4)
    expect(
      assignments.filter(({ allegiance }) => allegiance === 'Saboteur'),
    ).toHaveLength(1)
    expect(
      assignments.filter(({ allegiance }) => allegiance === 'Crew'),
    ).toHaveLength(3)
    expect(assignments.map(({ workstation }) => workstation).sort()).toEqual(
      [...WORKSTATIONS].sort(),
    )
  })

  it('produces reproducible assignments with an injected random generator', () => {
    const values = [0.1, 0.8, 0.3, 0.9, 0.5, 0.2]

    expect(assignPlayers(playerNames, randomFrom(values))).toEqual(
      assignPlayers(playerNames, randomFrom(values)),
    )
  })

  it('shuffles workstations independently from allegiances', () => {
    const workstationRandom = [0.99, 0.99, 0.99]
    const first = assignPlayers(
      playerNames,
      randomFrom([...workstationRandom, 0, 0, 0]),
    )
    const second = assignPlayers(
      playerNames,
      randomFrom([...workstationRandom, 0.99, 0.99, 0.99]),
    )

    expect(first.map(({ workstation }) => workstation)).toEqual(
      second.map(({ workstation }) => workstation),
    )
    expect(first.map(({ allegiance }) => allegiance)).not.toEqual(
      second.map(({ allegiance }) => allegiance),
    )
  })

  it('does not mutate the input player array', () => {
    const originalNames = [...playerNames]

    assignPlayers(originalNames, () => 0.25)

    expect(originalNames).toEqual(playerNames)
  })

  it.each(invalidNameSets)(
    'rejects invalid player data: $names',
    ({ names }) => {
      expect(() => assignPlayers(names, () => 0.5)).toThrow(
        'Exactly four non-empty player names are required.',
      )
    },
  )

  it('rejects random values outside the unit interval', () => {
    expect(() => assignPlayers(playerNames, () => 1)).toThrow(
      'The random generator must return values in [0, 1).',
    )
  })
})
