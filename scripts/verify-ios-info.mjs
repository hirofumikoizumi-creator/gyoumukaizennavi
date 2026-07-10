import { readFileSync } from 'node:fs';

const plist = readFileSync('ios/App/App/Info.plist', 'utf8');
const checks = [
  '<key>CFBundleIdentifier</key>',
  '<string>GSW.com.gyomukaizennavi</string>',
  '<key>GADApplicationIdentifier</key>',
  '<key>NSUserTrackingUsageDescription</key>',
  '</dict>',
  '</plist>'
];

const missing = checks.filter((item) => !plist.includes(item));
if (missing.length) {
  console.error(`Missing plist entries: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Info.plist verification passed.');
