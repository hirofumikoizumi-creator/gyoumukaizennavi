# CODEX実装指示書：業務改善ナビ iOSアプリ化（Capacitor）

対象：App Store一般公開版（広告収益化あり）
入力資産：`gyomu-kaizen-app.html`（完成済みプロトタイプ・単一HTML）

---

## 0. ゴール

- 既存HTML（業務改善ナビ）をCapacitorでラップし、iOSネイティブアプリとしてApp Storeに公開できる状態にする
- AdMobによる収益化：バナー広告（全画面共通）＋ リワード広告（提案タブの詳細アクションプラン解放）
- インタースティシャルは**今回は実装しない**（ユニットは作成済みだが未使用のまま保持）

## 1. プロジェクト構成

```
gyomu-kaizen-navi/
├── www/                  # 既存HTMLをここに配置
│   ├── index.html        # gyomu-kaizen-app.html をリネーム
│   ├── manifest.json     # PWA用（Web版併用のため残す）
│   └── icons/            # アプリアイコン各サイズ
├── capacitor.config.ts
├── ios/                  # npx cap add ios で生成
└── package.json
```

セットアップ手順：
```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios
npm install @capacitor-community/admob @capacitor/preferences
npx cap init "業務改善ナビ" "jp.co.tanabeconsulting.gyomukaizen" --web-dir www
npx cap add ios
npx cap sync
```

- appId は上記を仮とする（Apple Developer側のBundle IDに合わせて調整可）
- ビルドツール（Vite等）は不要。単一HTMLをそのまま www/ に置く

## 2. 既存HTMLの改修ポイント

HTML内に `【CODEX】` コメントで置換箇所を明記済み。以下を対応する。

### 2-1. データ保存
- `localStorage` → `@capacitor/preferences` に置換（iOSでのデータ消失対策）
- 既存の保存キー構造は変更しない（プロトタイプと互換維持）
- 同期APIから非同期APIへの書き換えに伴い、`app.init()` を async 化

### 2-2. 広告モックの実SDK置換（@capacitor-community/admob）

**AdMob アプリ／ユニットID（本番用）**
| 用途 | ユニット名 | ID |
|---|---|---|
| バナー | banner_main | ca-app-pub-5840457424714744/9086977514 |
| リワード | Reward_main | ca-app-pub-5840457424714744/2329997478 |
| （未使用）インタースティシャル | interstitial_main | ca-app-pub-5840457424714744/6700487321 |

**開発・審査提出前のテストは必ずGoogle公式テストIDを使用すること**（自クリック・テスト表示による本番ID使用はAdMobアカウント停止リスク）：
- バナー: `ca-app-pub-3940256099942544/2934735716`
- リワード: `ca-app-pub-3940256099942544/1712485313`
- 環境変数 or ビルドフラグで test/prod を切替できる実装にする

**バナー**
- 現在の `.ad-banner`（モック枠）を削除し、`AdMob.showBanner()` で `BannerAdPosition.BOTTOM_CENTER` に表示
- タブバーとの重なり調整：バナー表示後に `bannerAdSizeChanged` イベントで body の padding-bottom を動的調整
- 計測ボタンとの誤タップ防止のため、既存の余白設計（--banner-h）を維持

**リワード**
- `app.watchReward()` のモック（5秒カウントダウン）を `AdMob.prepareRewardVideoAd()` + `AdMob.showRewardVideoAd()` に置換
- **報酬付与は `onRewarded` イベント受信時のみ**。途中クローズ（dismiss）では解放しない
- 解放ロジック（24時間有効・期限切れ自動ロック）は既存実装をそのまま利用
- 広告在庫がない場合（load失敗）のフォールバック：「時間をおいて再度お試しください」トースト表示。**無料で解放はしない**

### 2-3. ATT（App Tracking Transparency）対応 — 審査必須
- `AdMob.initialize()` 前に `AdMob.trackingAuthorizationStatus()` を確認し、未決定なら `requestTrackingAuthorization()` を呼ぶ
- 呼び出しタイミング：初回オンボーディング（業種×職種選択）完了後。起動直後のダイアログ連発を避ける
- Info.plist に `NSUserTrackingUsageDescription` を追加：
  「お客様に最適な広告を表示するために使用されます。許可しない場合も広告は表示されますが、関連性が低くなります。」
- 拒否された場合は `npa=1`（非パーソナライズ広告）でAdMob初期化

### 2-4. iOSネイティブ調整
- Info.plist: `GADApplicationIdentifier`（AdMobアプリID。AdMob管理画面の「アプリの設定」から取得。ユニットIDと混同しないこと）
- ステータスバー：`@capacitor/status-bar` で style=Light、背景 #0a5cb8
- セーフエリア：既存CSSの env(safe-area-inset-*) 対応済み。実機で確認のみ
- スプラッシュ：`@capacitor/splash-screen`。背景 #0a5cb8、ロゴ中央配置
- 画面回転：iPhoneは縦固定、iPadは全方向対応
- タイマー計測のバックグラウンド対応：開始時刻をタイムスタンプ保存し、復帰時に経過時間を再計算する方式（既存実装を確認し、setIntervalのカウント依存になっていれば修正）

## 3. アプリアイコン・ストア素材

- アイコン：1024×1024（ストップウォッチ＋チャートのモチーフ、ブランドカラー #0a5cb8）
- スクリーンショット：6.9インチ / 6.5インチ / 13インチiPad 各サイズ（計測・棚卸し・分析・提案の4画面）

## 4. App Store申請チェックリスト

- [ ] Apple Developer Program 登録済み・Bundle ID作成
- [ ] 審査ガイドライン4.2対策：オフライン完結動作（localStorage/Preferencesのみで動作）を維持
- [ ] ATT実装済み・文言がプライバシーポリシーと整合
- [ ] App Privacy（プライバシー栄養ラベル）：AdMobによる「識別子・使用状況データの収集」を申告
- [ ] プライバシーポリシーURL（AdMob利用・データ収集の記載必須）※Web公開ページを用意
- [ ] 審査用ビルドでは広告がテストIDでないこと（本番IDに切替済み）を確認 ※審査員の操作は無効トラフィック扱いにならない
- [ ] デモ用サンプルデータ投入機能は残してよい（審査員がすぐ全機能を確認できて有利）
- [ ] 年齢レーティング：4+
- [ ] カテゴリ：ビジネス / 仕事効率化

## 5. 動作確認項目

1. 初回起動 → 業種×職種オンボーディング → メニュー生成
2. 計測開始 → アプリをバックグラウンド → 10分後復帰 → 経過時間が正しい
3. 棚卸しのAI自動判定 → 分析タブ反映
4. 提案タブ → リワード広告視聴 → 詳細プラン解放 → アプリ再起動後も解放継続 → 24時間後ロック復帰
5. リワード視聴を途中キャンセル → 解放されないこと
6. ATT拒否時も広告表示されること（非パーソナライズ）
7. iPad横向きレイアウト崩れなし

## 6. 将来拡張（今回スコープ外・コード内コメント維持）

- AI判定のローカルLLM/社内Ollamaサーバー置換（`aiClassify()` 1関数の差し替えで対応可能な構造を維持）
- クライアント企業向け 広告なし版（カスタムApp配布）：ビルドフラグで広告モジュール全体をオフにできる設計にしておく
- Android版（Capacitorなので `npx cap add android` で展開可能）

---

## 7. クラウドCIビルド（Mac不要・Windows開発環境向け）

開発機はWindowsのみ。iOSビルド・署名・App Store Connect提出はすべてクラウドCIで行う。
**第一候補：Codemagic**（Capacitor公式サポートあり、無料枠 月500分のmacOSビルド）。バックアップとしてGitHub Actionsの構成も記載。

### 7-1. 事前準備（1回だけ・すべてWindowsのブラウザで完結）

1. **GitHubリポジトリ作成**：プロジェクト一式をpush（`ios/` ディレクトリも含める）
2. **Apple Developer登録**（済みでなければ）
3. **App Store Connect APIキー発行**（署名・提出の自動化に使用。Macでの証明書作業を完全に不要にする）
   - App Store Connect → ユーザとアクセス → 統合 → APIキー → 「App Manager」ロールで作成
   - 控えるもの：**Issuer ID / Key ID / .p8ファイル**（.p8は一度しかダウンロードできないので厳重保管）
4. **App Store ConnectでアプリのBundle ID登録**：`jp.co.tanabeconsulting.gyomukaizen`（Identifiers作成もブラウザで可能）
5. **Codemagicアカウント作成** → GitHubリポジトリを接続
   - Team settings → Code signing identities → App Store Connect APIキー（上記3）を登録
   - Codemagicの **Automatic code signing** を使う。証明書・プロビジョニングプロファイルはCodemagicが自動生成・管理（Mac不要の要）

### 7-2. codemagic.yaml（リポジトリ直下に配置）

```yaml
workflows:
  ios-release:
    name: iOS App Store Release
    instance_type: mac_mini_m2
    max_build_duration: 60
    environment:
      node: 20
      xcode: latest
      cocoapods: default
      ios_signing:
        distribution_type: app_store
        bundle_identifier: jp.co.tanabeconsulting.gyomukaizen
      groups:
        - appstore_credentials   # APP_STORE_CONNECT_* 変数グループ
      vars:
        APP_ID: jp.co.tanabeconsulting.gyomukaizen
    triggering:
      events:
        - tag                    # vX.Y.Z タグのpushでリリースビルド
    scripts:
      - name: Install dependencies
        script: npm ci
      - name: Capacitor sync
        script: npx cap sync ios
      - name: Install CocoaPods
        script: cd ios/App && pod install
      - name: Increment build number
        script: |
          cd ios/App
          agvtool new-version -all $(($BUILD_NUMBER))
      - name: Build ipa
        script: |
          xcode-project use-profiles
          xcode-project build-ipa \
            --workspace ios/App/App.xcworkspace \
            --scheme App
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        auth: integration        # 7-1で登録したAPIキーを使用
        submit_to_testflight: true
        # 審査提出まで自動化する場合は submit_to_app_store: true
```

- 変数グループ `appstore_credentials` はCodemagic UIで作成（APIキー連携済みなら auth: integration のみで動く）
- **運用フロー**：Windowsでコード修正 → git push → タグ打ち（`git tag v1.0.0 && git push --tags`）→ 自動でビルド＆TestFlight配信 → iPhoneのTestFlightアプリで実機確認 → App Store Connectで審査提出
- 無料枠（月500分）はこのアプリなら十分（1ビルド15〜25分想定 ⇒ 月20回以上ビルド可能）

### 7-3. Windows側で必要なもの

- Git / Node.js（`npx cap sync` の動作確認用。iOSビルド自体はしない）
- Xcodeは**不要**。`ios/` ディレクトリの初回生成（`npx cap add ios`）はWindowsでも可能（中身はテンプレート生成のみ）
- 実機テスト：iPhoneに **TestFlightアプリ** を入れ、Codemagicからの自動配信を受け取る

### 7-4. GitHub Actions（バックアップ案）

- macOSランナー（`runs-on: macos-14`）で同等のビルドが可能。ただし：
  - 無料枠はmacOSは**消費係数10倍**（プライベートリポジトリだと月2,000分→実質200分）
  - 証明書・プロファイルの管理を自前でSecretsに登録する必要があり（fastlane match等）、Codemagicより設定難度が高い
- リポジトリをパブリックにできる場合は完全無料になるため選択肢になる。基本はCodemagic、枠超過時の代替として検討

### 7-5. CI関連チェックリスト

- [ ] .p8キーがリポジトリにコミットされていないこと（Codemagic UI登録のみ）
- [ ] テスト用AdMob ID / 本番IDの切替がビルド環境変数で制御できること（例：`AD_ENV=prod` タグビルド時のみ本番ID）
- [ ] TestFlight配信でATTダイアログ・広告表示・タイマーのバックグラウンド復帰を実機確認
- [ ] バージョン/ビルド番号の自動インクリメントが機能していること
