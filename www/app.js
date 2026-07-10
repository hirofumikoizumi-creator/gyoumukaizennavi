const STORAGE_KEYS = {
  task: 'gkn.task',
  category: 'gkn.category',
  priority: 'gkn.priority',
  plan: 'gkn.plan',
  detailUnlockedUntil: 'gkn.detailUnlockedUntil',
  timerStartedAt: 'gkn.timerStartedAt',
  timerDurationMs: 'gkn.timerDurationMs'
};

const AD_UNITS = {
  test: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    reward: 'ca-app-pub-3940256099942544/1712485313'
  },
  prod: {
    banner: 'ca-app-pub-5840457424714744/9086977514',
    reward: 'ca-app-pub-5840457424714744/2329997478'
  }
};

const AD_ENV = new URLSearchParams(location.search).get('adEnv') === 'prod' ? 'prod' : 'test';
const REWARD_MS = 24 * 60 * 60 * 1000;
const TIMER_MS = 5 * 60 * 1000;

const capacitor = window.Capacitor;
const plugins = capacitor?.Plugins ?? {};
const Preferences = plugins.Preferences;
const AdMob = plugins.AdMob;
const StatusBar = plugins.StatusBar;
const SplashScreen = plugins.SplashScreen;
const isNative = Boolean(capacitor?.isNativePlatform?.());

const storage = {
  async get(key) {
    if (Preferences) {
      const result = await Preferences.get({ key });
      return result.value;
    }
    return localStorage.getItem(key);
  },
  async set(key, value) {
    if (Preferences) {
      await Preferences.set({ key, value });
      return;
    }
    localStorage.setItem(key, value);
  },
  async remove(key) {
    if (Preferences) {
      await Preferences.remove({ key });
      return;
    }
    localStorage.removeItem(key);
  }
};

const els = {
  task: document.querySelector('#taskInput'),
  classify: document.querySelector('#classifyBtn'),
  timer: document.querySelector('#timerBtn'),
  reset: document.querySelector('#resetBtn'),
  category: document.querySelector('#categoryText'),
  priority: document.querySelector('#priorityText'),
  timerText: document.querySelector('#timerText'),
  plan: document.querySelector('#planList'),
  reward: document.querySelector('#rewardBtn'),
  unlockTitle: document.querySelector('#unlockTitle'),
  detail: document.querySelector('#detailPlan'),
  toast: document.querySelector('#toast'),
  tabs: [...document.querySelectorAll('.tab')],
  panels: [...document.querySelectorAll('.tab-panel')],
  navTargets: [...document.querySelectorAll('[data-tab-target]')]
};

const state = {
  task: '',
  category: '未分類',
  priority: '-',
  plan: [],
  detailUnlockedUntil: 0,
  timerStartedAt: 0,
  timerDurationMs: TIMER_MS,
  rewardGranted: false,
  nonPersonalizedAds: false
};

const app = {
  async init() {
    bindEvents();
    await loadState();
    render();
    await setupNativeChrome();
    await setupAds();
    await SplashScreen?.hide?.();
    tickTimer();
    setInterval(tickTimer, 1000);
  },

  async classify() {
    const task = els.task.value.trim();
    if (!task) {
      showToast('改善したい業務を入力してください。');
      return;
    }

    const result = aiClassify(task);
    state.task = task;
    state.category = result.category;
    state.priority = result.priority;
    state.plan = buildPlan(task, result.category);
    await persistState();
    render();
    setTab('plan');
  },

  async startTimer() {
    state.timerStartedAt = Date.now();
    state.timerDurationMs = TIMER_MS;
    await storage.set(STORAGE_KEYS.timerStartedAt, String(state.timerStartedAt));
    await storage.set(STORAGE_KEYS.timerDurationMs, String(state.timerDurationMs));
    tickTimer();
    showToast('5分タイマーを開始しました。');
  },

  async watchReward() {
    if (isUnlocked()) {
      showToast('詳細プランは解放済みです。');
      return;
    }

    if (!AdMob || !isNative) {
      showToast('広告SDKはネイティブアプリで有効になります。プレビューでは詳細を解放します。');
      await grantReward();
      return;
    }

    state.rewardGranted = false;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: AD_UNITS[AD_ENV].reward,
        isTesting: AD_ENV !== 'prod',
        npa: state.nonPersonalizedAds
      });
      await AdMob.showRewardVideoAd();
    } catch {
      showToast('時間をおいて再度お試しください。');
    }
  }
};

function bindEvents() {
  els.classify.addEventListener('click', () => app.classify());
  els.timer.addEventListener('click', () => app.startTimer());
  els.reward.addEventListener('click', () => app.watchReward());
  els.reset.addEventListener('click', resetAll);
  els.task.addEventListener('input', () => storage.set(STORAGE_KEYS.task, els.task.value));

  els.tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
  els.navTargets.forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tabTarget)));

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tickTimer();
  });
}

async function setupNativeChrome() {
  if (!isNative) return;
  await StatusBar?.setBackgroundColor?.({ color: '#0a5cb8' });
  await StatusBar?.setStyle?.({ style: 'LIGHT' });
}

async function setupAds() {
  if (!AdMob || !isNative) return;

  try {
    const status = await AdMob.trackingAuthorizationStatus();
    if (status?.status === 'notDetermined' || status?.status === 'notDetermined') {
      const requested = await AdMob.requestTrackingAuthorization();
      state.nonPersonalizedAds = requested?.status !== 'authorized';
    } else {
      state.nonPersonalizedAds = status?.status !== 'authorized';
    }

    await AdMob.initialize();
    await AdMob.addListener('bannerAdSizeChanged', (info) => {
      const height = Number(info?.height || 0);
      document.documentElement.style.setProperty('--banner-h', `${height}px`);
    });
    await AdMob.addListener('onRewarded', () => {
      state.rewardGranted = true;
      grantReward();
    });
    await AdMob.showBanner({
      adId: AD_UNITS[AD_ENV].banner,
      adSize: 'BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
      isTesting: AD_ENV !== 'prod',
      npa: state.nonPersonalizedAds
    });
  } catch {
    showToast('広告の初期化に失敗しました。通信環境をご確認ください。');
  }
}

async function loadState() {
  state.task = await storage.get(STORAGE_KEYS.task) ?? '';
  state.category = await storage.get(STORAGE_KEYS.category) ?? '未分類';
  state.priority = await storage.get(STORAGE_KEYS.priority) ?? '-';
  state.plan = parseJson(await storage.get(STORAGE_KEYS.plan), []);
  state.detailUnlockedUntil = Number(await storage.get(STORAGE_KEYS.detailUnlockedUntil) ?? 0);
  state.timerStartedAt = Number(await storage.get(STORAGE_KEYS.timerStartedAt) ?? 0);
  state.timerDurationMs = Number(await storage.get(STORAGE_KEYS.timerDurationMs) ?? TIMER_MS);
  els.task.value = state.task;
}

async function persistState() {
  await storage.set(STORAGE_KEYS.task, state.task);
  await storage.set(STORAGE_KEYS.category, state.category);
  await storage.set(STORAGE_KEYS.priority, state.priority);
  await storage.set(STORAGE_KEYS.plan, JSON.stringify(state.plan));
}

async function grantReward() {
  state.detailUnlockedUntil = Date.now() + REWARD_MS;
  await storage.set(STORAGE_KEYS.detailUnlockedUntil, String(state.detailUnlockedUntil));
  renderReward();
  showToast('詳細プランを24時間解放しました。');
}

function render() {
  els.category.textContent = state.category;
  els.priority.textContent = state.priority;
  els.plan.innerHTML = '';
  const items = state.plan.length ? state.plan : ['業務内容を入力して分類すると、改善ステップを表示します。'];
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    els.plan.append(li);
  });
  renderReward();
}

function renderReward() {
  if (isUnlocked()) {
    const remainHours = Math.max(1, Math.ceil((state.detailUnlockedUntil - Date.now()) / 3600000));
    els.unlockTitle.textContent = `あと約${remainHours}時間利用できます`;
    els.reward.textContent = '解放済み';
    els.detail.classList.remove('locked');
    els.detail.innerHTML = detailHtml();
    return;
  }
  els.unlockTitle.textContent = '広告視聴で24時間解放';
  els.reward.textContent = '解放する';
  els.detail.classList.add('locked');
  els.detail.textContent = '詳細な手順、確認観点、次回見直しポイントは広告視聴後に表示されます。';
}

function tickTimer() {
  if (!state.timerStartedAt) {
    els.timerText.textContent = '05:00';
    return;
  }
  const elapsed = Date.now() - state.timerStartedAt;
  const remaining = Math.max(0, state.timerDurationMs - elapsed);
  const min = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const sec = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  els.timerText.textContent = `${min}:${sec}`;
  if (remaining === 0) {
    state.timerStartedAt = 0;
    storage.remove(STORAGE_KEYS.timerStartedAt);
    showToast('整理タイマーが終了しました。');
  }
}

function aiClassify(text) {
  const lower = text.toLowerCase();
  if (/集計|入力|転記|excel|スプレッド|報告/.test(lower)) {
    return { category: '自動化', priority: '高' };
  }
  if (/承認|確認|依頼|連絡|メール|会議/.test(lower)) {
    return { category: 'フロー改善', priority: '中' };
  }
  if (/探す|共有|ナレッジ|資料|マニュアル/.test(lower)) {
    return { category: '情報整理', priority: '中' };
  }
  return { category: 'ムダ削減', priority: '中' };
}

function buildPlan(task, category) {
  return [
    `${category}の観点で「${task}」の開始条件と完了条件を1行で定義する`,
    '毎回発生する作業、判断が必要な作業、例外対応を3つに分ける',
    '頻度と所要時間を見積もり、月間で最も効果が大きい箇所を1つ選ぶ',
    '次回実施時に使えるチェックリストまたはテンプレートを作る'
  ];
}

function detailHtml() {
  return `
    <strong>詳細プラン</strong>
    <p>1. 現状手順を5分以内で書き出し、重複入力と待ち時間に印を付けます。</p>
    <p>2. 先に小さく変える箇所を1つ選び、担当者・期限・完了条件を決めます。</p>
    <p>3. 1週間後に削減時間、ミス件数、心理的負担の3点で効果を確認します。</p>
  `;
}

function setTab(name) {
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  els.panels.forEach((panel) => panel.classList.toggle('active', panel.id === `${name}Tab`));
}

async function resetAll() {
  await Promise.all(Object.values(STORAGE_KEYS).map((key) => storage.remove(key)));
  Object.assign(state, {
    task: '',
    category: '未分類',
    priority: '-',
    plan: [],
    detailUnlockedUntil: 0,
    timerStartedAt: 0,
    timerDurationMs: TIMER_MS
  });
  els.task.value = '';
  render();
  tickTimer();
  showToast('保存データをリセットしました。');
}

function isUnlocked() {
  return state.detailUnlockedUntil > Date.now();
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

app.init();
