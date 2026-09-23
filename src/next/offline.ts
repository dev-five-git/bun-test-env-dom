import type { ReactNode } from 'react'

import { state } from './state.ts'

/** `next/offline`: online unless a test calls `setOffline(true)`. */
export const useOffline = () => state.offline

export function dispatchOfflineChange(isOffline: boolean) {
  state.offline = isOffline
}

export function OfflineProvider({ children }: { children?: ReactNode }) {
  return children
}
