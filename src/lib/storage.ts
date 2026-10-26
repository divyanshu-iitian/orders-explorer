// localStorage can throw (private mode, disabled storage, quota) or hold
// anything at all, so every read is validated and every failure is ignored.

const PREFIX = 'orders-explorer:'

export function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Not fatal: the preference just lasts for this session.
  }
}
