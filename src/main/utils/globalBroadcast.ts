import { BrowserWindow } from "electron";
import { createLogger } from "@/main/utils/createLogger";

const log = createLogger("globalBroadcast", true);

// 白名单
const whiteList = new Set(["main", "chat", "setting", "record", "forward"]);

let pendingBroadcasts: { channel: string; data: any[] }[] = [];
let broadcastScheduled = false;

function globalBroadcast(channel: string, ...data: any[]) {
  pendingBroadcasts.push({ channel, data });

  if (!broadcastScheduled) {
    broadcastScheduled = true;
    setImmediate(() => {
      const broadcasts = pendingBroadcasts;
      pendingBroadcasts = [];
      broadcastScheduled = false;
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) {
          try {
            for (const b of broadcasts) {
              const url = window.webContents.getURL();
              const hash = url.split("#")[1] || "";
              const firstSegment = hash.split("/")[1];
              if (whiteList.has(firstSegment)) {
                log("send", firstSegment, b.channel);
                window.webContents.send(b.channel, ...b.data);
              }
            }
          } catch (err) {
            log("广播失败:", err);
          }
        }
      }
    });
  }
}

export { globalBroadcast };
