import type { Workspace } from "./state";
export interface DesktopApi {
  open_sync(workspace: Workspace): Promise<string>;
  sync_result(token: string): Promise<Workspace | null>;
  new_window(id: string): Promise<void>;
  open_external(url: string): Promise<void>;
}
export function desktopApi(): DesktopApi | undefined {
  return (window as unknown as { pywebview?: { api?: DesktopApi } }).pywebview
    ?.api;
}
