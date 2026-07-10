# Gyomu Kaizen Navi

Capacitor iOS wrapper for the Gyomu Kaizen Navi prototype.

## Setup

```bash
npm install
npm run sync:ios
```

## Build Notes

- Bundle ID: `GSW.com.gyomukaizennavi`
- Apple Team ID: `2GKZ33FAB9`
- App Store Connect Apple ID: `6789396090`
- AdMob app ID must be filled in before App Store submission:
  - `capacitor.config.ts`
  - `ios/App/App/Info.plist` after running `npx cap add ios`

Set `AD_ENV=prod` for production ad unit IDs. The app defaults to Google's AdMob test IDs unless production is explicitly enabled.

## iOS Native Steps

```bash
npm run add:ios
ADMOB_APP_ID=npm run patch:ios-info
npm run sync:ios
```

The AdMob app ID is set from the AdMob app URL and app settings: `ca-app-pub-5840457424714744~2713140850`.

