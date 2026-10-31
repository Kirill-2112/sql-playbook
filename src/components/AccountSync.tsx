import { useEffect } from 'react'
import { hasAccountActivity, startAccounts, watchProgress } from '../progress/account'

// Starts accounts at launch for people who use them (or who just opened a sign-in link) and keeps progress in sync.
export function AccountSync() {
  useEffect(() => {
    if (hasAccountActivity()) void startAccounts()
    return watchProgress()
  }, [])
  return null
}
