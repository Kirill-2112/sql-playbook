/**
 * Where the app runs. The iOS app (Capacitor, ios/) is built with `npm run ios:build` (vite --mode ios, .env.ios):
 * it loads the same pages from capacitor://localhost, so calls to our API need the site's full address, and features
 * that only work on the website (Web Push, Google sign-in in a browser) are left out there.
 */
export const NATIVE = import.meta.env.VITE_NATIVE === '1'

/** Prefix for our API: '' on the website (same origin), the site's address inside the app. */
export const API_ORIGIN: string = NATIVE ? (import.meta.env.VITE_API_ORIGIN ?? 'https://sql.kirillabs.com') : ''

/** The public website, for links that must open there (e.g. the sign-in link in an email). */
export const SITE_URL = 'https://sql.kirillabs.com/'
