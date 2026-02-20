import { ipcMain, dialog, BrowserWindow } from "electron";
import { mainWindow } from "@/main/utils/captureWindow";
import { getSystemStats } from "@/main/modules/systemMonitor";

function setupIpcMain() {
  // 返回窗口id
  ipcMain.on("lite_tools.getWebContentId", (event) => {
    event.returnValue = event.sender.id;
  });
  // 使用主进程广播
  ipcMain.on("lite_tools.broadcast", (event, channelName, payload) => {
    if (mainWindow && mainWindow?.webContents?.send) {
      mainWindow.webContents.send("lite_tools.broadcast", channelName, payload);
    }
  });
  // 通用文件选择弹窗
  ipcMain.handle("lite_tools.showOpenDialog", (event, options: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return dialog.showOpenDialog(win!, options);
  });
  // 获取系统状态
  ipcMain.handle("lite_tools.getSystemStats", () => {
    return getSystemStats();
  });
}

export { setupIpcMain };
