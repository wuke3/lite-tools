import { contextBridge, ipcRenderer } from "electron";
import type { RecallMsgId } from "@/common/types/preventRecall";
import type { WallpaperData } from "@/common/types/wallpaper";
import type { ToastType, Toast } from "@/common/types/toastManager";

const exposeFunctions = {
  // 配置相关
  updateConfig: (config: Config) => ipcRenderer.send("lite_tools.updateConfig", config),
  getConfig: async (): Promise<Config> => ipcRenderer.invoke("lite_tools.getConfig"),
  isIndependent: (): boolean => ipcRenderer.sendSync("lite_tools.isIndependent"),
  isInitialized: (): boolean => ipcRenderer.sendSync("lite_tools.isInitialized"),
  onConfigChange: (callback: (config: Config) => void) =>
    ipcRenderer.on("lite_tools.configChanged", (_, config: Config) => callback(config)),
  getWebContentId: (): number => ipcRenderer.sendSync("lite_tools.getWebContentId"),
  showOpenDialog: (options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke("lite_tools.showOpenDialog", options),
  // 背景相关
  onWallpaperChanged: (callback: (data: WallpaperData) => void) =>
    ipcRenderer.on("lite_tools.wallpaperChanged", (_, data) => callback(data)),
  getWallpaperData: () => ipcRenderer.send("lite_tools.getWallpaperData"),
  // 防撤回相关
  onRecallMessagesFound: (callback: (recallMsgIds: RecallMsgId[]) => void) =>
    ipcRenderer.on("lite_tools.recallMessagesFound", (_, recallMsgIds: RecallMsgId[]) => callback(recallMsgIds)),
  onUpdateRecallCacheSize: (callback: (size: number) => void) =>
    ipcRenderer.on("lite_tools.updateRecallCacheSize", (_, size: number) => callback(size)),
  getRecallCacheSize: (): Promise<number> => ipcRenderer.invoke("lite_tools.getRecallCacheSize"),
  clearRecallCache: () => ipcRenderer.send("lite_tools.clearRecallCache"),
  openRecallMsgList: () => ipcRenderer.send("lite_tools.openRecallMsgList"),
  openRedirectPicPath: () => ipcRenderer.send("lite_tools.openRedirectPicPath"),
  // ipc转broadcast
  onBroadcast: (callback: (channelName: any, payload: any) => void) =>
    ipcRenderer.on("lite_tools.broadcast", (_, channelName, payload) => callback(channelName, payload)),
  sendBroadcast: (channelName: any, payload: any) => ipcRenderer.send("lite_tools.broadcast", channelName, payload),
  // toast 通知
  onToast: (callback: (toast: Toast) => void) =>
    ipcRenderer.on("lite_tools.toast", (_, toast: Toast) => callback(toast)),
  clearToast: (callback: () => void) => ipcRenderer.on("lite_tools.clearToast", callback),
  // 系统监控
  getSystemStats: async (): Promise<{ cpu: number; memory: number }> =>
    ipcRenderer.invoke("lite_tools.getSystemStats"),
  // 原生接口调用
  nativeCall: (event: any, payload: any, awaitCallback?: boolean | string | string[]) => {
    const callbackId = crypto.randomUUID();
    const webContentId = ipcRenderer.sendSync("lite_tools.getWebContentId");
    let resolve;
    if (awaitCallback) {
      resolve = new Promise((res) => {
        function onEvent(...args: any[]) {
          if (typeof awaitCallback === "boolean") {
            if (args[1]?.callbackId === callbackId) {
              ipcRenderer.off(`RM_IPCFROM_MAIN${webContentId}`, onEvent);
              res(args[2]);
            }
          } else if (Array.isArray(awaitCallback)) {
            if (awaitCallback.includes(args?.[1]?.cmdName)) {
              ipcRenderer.off(`RM_IPCFROM_MAIN${webContentId}`, onEvent);
              res(args[2]);
            }
          } else {
            if (args?.[2]?.cmdName === awaitCallback) {
              ipcRenderer.off(`RM_IPCFROM_MAIN${webContentId}`, onEvent);
              res(args[2]);
            }
          }
        }
        ipcRenderer.on(`RM_IPCFROM_MAIN${webContentId}`, onEvent);
      });
    } else {
      resolve = Promise.resolve(null);
    }
    ipcRenderer.send(
      `RM_IPCFROM_RENDERER${webContentId}`,
      {
        peerId: webContentId,
        callbackId,
        ...event,
      },
      payload,
    );
    return resolve;
  },
};

contextBridge.exposeInMainWorld("lite_tools", exposeFunctions);

export type LiteTools = typeof exposeFunctions;
