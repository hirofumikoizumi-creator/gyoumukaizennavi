import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const plistPath = 'ios/App/App/Info.plist';
const admobAppId = process.env.ADMOB_APP_ID ?? 'ca-app-pub-5840457424714744~2713140850';
const trackingText = 'お客様に最適な広告を表示するために使用されます。許可しない場合も広告は表示されますが、関連性は低くなります。';

if (!existsSync(plistPath)) {
  console.error(`${plistPath} not found. Run "npm run add:ios" first.`);
  process.exit(1);
}

let plist = readFileSync(plistPath, 'utf8');

function upsertString(key, value) {
  const pattern = new RegExp(`\\s*<key>${key}</key>\\s*<string>[^<]*</string>`, 'm');
  const entry = `\n\t<key>${key}</key>\n\t<string>${value}</string>`;
  if (pattern.test(plist)) {
    plist = plist.replace(pattern, entry);
    return;
  }
  plist = plist.replace('</dict>', `${entry}\n</dict>`);
}

upsertString('CFBundleIdentifier', 'GSW.com.gyomukaizennavi');
upsertString('GADApplicationIdentifier', admobAppId);
upsertString('NSUserTrackingUsageDescription', trackingText);

writeFileSync(plistPath, plist);
console.log('Info.plist patched for Bundle ID, AdMob, and ATT.');

