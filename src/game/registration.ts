export type PlayerNames = [string, string, string, string]

export function createEmptyPlayerNames(): PlayerNames {
  return ['', '', '', '']
}

export function arePlayerNamesComplete(
  names: readonly string[],
): names is PlayerNames {
  return (
    names.length === 4 &&
    names.every((name) => typeof name === 'string' && name.trim().length > 0)
  )
}

export function updatePlayerName(
  names: PlayerNames,
  index: number,
  value: string,
): PlayerNames {
  if (!Number.isInteger(index) || index < 0 || index >= names.length) {
    throw new RangeError('The player index is outside the registration list.')
  }

  return [
    index === 0 ? value : names[0],
    index === 1 ? value : names[1],
    index === 2 ? value : names[2],
    index === 3 ? value : names[3],
  ]
}
