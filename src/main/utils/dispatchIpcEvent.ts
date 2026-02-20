import { WebContents, webContents, ipcMain } from "electron";
import { randomUUID } from "crypto";
import { createLogger } from "@/main/utils/createLogger";

const log = createLogger("dispatchIpcEvent");

interface FakeIpcEvent {
  sender: WebContents | null;
  reply?: (...args: any[]) => void;
  returnValue?: any;
}

function dispatchIpcEvent(
  webContentId: number,
  event: any,
  payload: any,
  awaitCallback?: boolean | string | string[]
): Promise<any> {
  const webContent = webContents.fromId(webContentId);
  if (!webContent) {
    return Promise.resolve(null);
  }
  const callbackId = randomUUID();
  const ipcFromMain = `RM_IPCFROM_MAIN${webContentId}`;
  const ipcFromRenderer = `RM_IPCFROM_RENDERER${webContentId}`;
  let resolve;
  if (awaitCallback) {
    resolve = new Promise((res) => {
      function onEvent(channel: string, ...args: any[]): InterceptResult {
        if (channel === ipcFromMain) {
          if (typeof awaitCallback === "boolean") {
            if (args[0]?.callbackId === callbackId) {
              unsubscribe();
              res(args[1]);
              return {
                action: "block",
              };
            }
          } else if (Array.isArray(awaitCallback)) {
            if (awaitCallback.includes(args?.[1]?.cmdName)) {
              unsubscribe();
              res(args[1]);
              return {
                action: "block",
              };
            }
          } else {
            if (args?.[1]?.cmdName === awaitCallback) {
              unsubscribe();
              res(args[1]);
              return {
                action: "block",
              };
            }
          }
        }
        return {
          action: "pass",
        };
      }
      const unsubscribe = IpcInterceptor.interceptIpcSend(onEvent);
    });
  } else {
    resolve = Promise.resolve(null);
  }

  const listeners = ipcMain.listeners(ipcFromRenderer);
  if (listeners.length !== 0) {
    const fakeEvent: FakeIpcEvent = {
      sender: webContent ?? null,
      reply(...replyArgs: any[]) {
        if (fakeEvent.sender) fakeEvent.sender.send(ipcFromRenderer, ...replyArgs);
      },
    };

    for (const fn of listeners) {
      try {
        fn(
          fakeEvent,
          {
            peerId: webContentId,
            callbackId,
            ...event,
          },
          payload
        );
      } catch (err) {
        log(`[emitFakeIpc:send] handler error`, err);
      }
    }
  } else {
    resolve = Promise.resolve(null);
  }
  return resolve;
}

export { dispatchIpcEvent };
