import { describe, expect, it } from 'vitest'
import {
  arePlayerNamesComplete,
  createEmptyPlayerNames,
  updatePlayerName,
} from '../src/game/registration'

describe('player registration', () => {
  it('starts a new registration with four empty names', () => {
    expect(createEmptyPlayerNames()).toEqual(['', '', '', ''])
  })

  it('disables NEXT when any individual player name is empty', () => {
    expect(arePlayerNamesComplete(createEmptyPlayerNames())).toBe(false)
    for (let emptyIndex = 0; emptyIndex < 4; emptyIndex += 1) {
      const names = ['Ari', 'Bea', 'Cal', 'Dev']
      names[emptyIndex] = ''

      expect(arePlayerNamesComplete(names)).toBe(false)
    }
  })

  it('disables NEXT when any individual player name contains only whitespace', () => {
    for (let whitespaceIndex = 0; whitespaceIndex < 4; whitespaceIndex += 1) {
      const names = ['Ari', 'Bea', 'Cal', 'Dev']
      names[whitespaceIndex] = ' \t '

      expect(arePlayerNamesComplete(names)).toBe(false)
    }
  })

  it('keeps NEXT disabled when an earlier player is blank even if PLAYER 04 is valid', () => {
    for (let emptyIndex = 0; emptyIndex < 3; emptyIndex += 1) {
      const names = ['Ari', 'Bea', 'Cal', 'Dev']
      names[emptyIndex] = ''

      expect(names[3]).toBe('Dev')
      expect(arePlayerNamesComplete(names)).toBe(false)
    }
  })

  it('enables NEXT only when all four names contain non-whitespace content', () => {
    expect(arePlayerNamesComplete([' Ari ', 'Bea', 'Cal', 'Dev'])).toBe(true)
  })

  it('updates one entry without mutating the existing registration state', () => {
    const originalNames = createEmptyPlayerNames()
    const updatedNames = updatePlayerName(originalNames, 2, 'Cal')

    expect(originalNames).toEqual(['', '', '', ''])
    expect(updatedNames).toEqual(['', '', 'Cal', ''])
  })

  it('rejects invalid player indexes', () => {
    expect(() => updatePlayerName(createEmptyPlayerNames(), 4, 'Dev')).toThrow(
      'The player index is outside the registration list.',
    )
  })
})
