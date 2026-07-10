import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'GSW.com.gyomukaizennavi',
  appName: '業務改善ナビ',
  webDir: 'www',
  ios: {
    scheme: 'GyomuKaizenNavi',
    contentInset: 'automatic'
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-5840457424714744~2713140850'
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a5cb8',
      showSpinner: false
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0a5cb8',
      overlaysWebView: false
    }
  }
};

export default config;

