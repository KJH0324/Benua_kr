export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.protocol === "capacitor:" ||
    Boolean((window as any).Capacitor?.isNativePlatform?.())
  );
}

export function isAdminSubdomain(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return false; // 모바일 앱은 항상 쇼핑몰 스토어프론트로 동작
  const host = window.location.hostname;
  return host.startsWith("dash.") || host.startsWith("admin.");
}