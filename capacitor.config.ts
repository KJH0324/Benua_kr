import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "shop.benua.app",
  appName: "Benua",
  webDir: "dist",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
    allowNavigation: [
      "benua.shop",
      "*.benua.shop",
      "*.tosspayments.com",
      "*.kakao.com",
      "*.naver.com",
      "*.google.com",
    ],
  },
};

export default config;