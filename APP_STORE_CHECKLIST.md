# App Store Checklist

- [x] Bundle ID fixed to `GSW.com.gyomukaizennavi`
- [x] Capacitor app shell prepared
- [x] Offline-first data storage via Capacitor Preferences with web fallback
- [x] Banner and rewarded AdMob integration points added
- [x] Interstitial ad unit intentionally unused
- [x] ATT request flow added before AdMob initialization
- [x] Non-personalized ads requested when tracking is denied
- [x] Codemagic TestFlight workflow added
- [x] AdMob app ID set to `ca-app-pub-5840457424714744~2713140850`
- [x] Run `npm install`
- [x] Run `npm run add:ios`
- [x] Run `npm run patch:ios-info`
- [x] Run `npm run sync:ios`
- [ ] Generate iOS certificate in Codemagic after `ios/` exists in the repository
- [ ] Publish a privacy policy URL and configure App Privacy labels for AdMob
- [ ] Confirm production build uses `AD_ENV=prod`
- [ ] Test with TestFlight on iPhone and iPad

