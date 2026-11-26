import type { CapacitorConfig } from '@capacitor/cli'

// The iOS app: the same React app, built with `npm run ios:build` (vite --mode ios into dist-ios/) and copied into
// ios/App. appId is the bundle id registered with Apple; it cannot change once the app is in App Store Connect.
const config: CapacitorConfig = {
  appId: 'com.kirillabs.sqlplaybook',
  appName: 'SQL Playbook',
  webDir: 'dist-ios',
  ios: {
    // The pages handle the notch and home indicator themselves (env(safe-area-inset-*), viewport-fit=cover).
    contentInset: 'never',
    backgroundColor: '#F6F6F2',
  },
}

export default config
