import type { Workspace } from "./state";
export interface DesktopApi {
  open_login(): Promise<string>;
  login_result(
    token: string,
  ): Promise<{ idToken: string; accessToken?: string } | null>;
  new_window(id: string): Promise<void>;
  open_external(url: string): Promise<void>;
}
export function desktopApi(): DesktopApi | undefined {
  return (window as unknown as { pywebview?: { api?: DesktopApi } }).pywebview
    ?.api;
}
