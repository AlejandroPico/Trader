export interface AppConfig {
  marketApi?: string;
  sameOriginMarketApi?: boolean;
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    storageBucket?: string;
    messagingSenderId?: string;
  };
}
export let appConfig: AppConfig = {};
export async function loadAppConfig() {
  try {
    const response = await fetch(new URL("app-config.json", document.baseURI), {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) appConfig = await response.json();
    if (appConfig.sameOriginMarketApi) appConfig.marketApi = location.origin;
  } catch {
    /* Local operation does not require the account service. */
  }
}
export function marketApi() {
  if (location.port === "8765") return location.origin;
  if (appConfig.marketApi) return appConfig.marketApi.replace(/\/$/, "");
  return ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://127.0.0.1:8765"
    : "";
}
