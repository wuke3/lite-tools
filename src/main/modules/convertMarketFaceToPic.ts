import { existsSync } from "node:fs";
import { webContents } from "electron";
import { dispatchIpcEvent } from "@/main/utils/dispatchIpcEvent";
import { configManager } from "@/main/modules/configManager";

const faceFilePaths = new Set<string>();
const awaitIsFileExist = new Map<string, Function>();

function convertMarketFaceToPic(msgList: any[], webContentId: number) {
  for (const msgItem of msgList) {
    for (const msgElement of msgItem.elements) {
      if (msgElement?.marketFaceElement) {
        downloadMarketFace(msgElement.marketFaceElement, webContentId);
        msgElement.picElement = replaceMarketFace(msgElement.marketFaceElement);
        msgElement.marketFaceElement = null;
        msgElement.elementType = 2;
        msgItem.msgType = 2;
        msgItem.subMsgType = 4096;
      }
    }
  }
}

function replaceMarketFace(marketFaceElement: any): object {
  const fileName = marketFaceElement.staticFacePath.split("\\").pop();
  const picWidth = marketFaceElement.imageHeight ?? 200;
  const picHeight = marketFaceElement.imageHeight ?? 200;
  const sourcePath = marketFaceElement.staticFacePath;
  faceFilePaths.add(sourcePath);
  const thumbPath = new Map([
    ["0", sourcePath],
    ["198", sourcePath],
    ["720", sourcePath],
  ]);
  return {
    picSubType: 1,
    fileName,
    fileSize: "142857",
    picWidth,
    picHeight,
    original: true,
    md5HexStr: "",
    sourcePath,
    thumbPath,
    transferStatus: 2,
    progress: 0,
    picType: 2000,
    invalidState: 0,
    fileUuid: "",
    fileSubId: "",
    thumbFileSize: 0,
    fileBizId: null,
    downloadIndex: null,
    summary: "",
    emojiFrom: null,
    emojiWebUrl: null,
    emojiAd: {
      url: "",
      desc: "",
    },
    emojiMall: {
      packageId: 0,
      emojiId: 0,
    },
    emojiZplan: {
      actionId: 0,
      actionName: "",
      actionType: 0,
      playerNumber: 0,
      peerUid: "0",
      bytesReserveInfo: "",
    },
    originImageMd5: "",
    originImageUrl: "",
    import_rich_media_context: null,
    isFlashPic: null,
    storeID: 1,
  };
}

function downloadMarketFace(marketFaceElement: any, webContentId: number) {
  if (!existsSync(marketFaceElement.staticFacePath)) {
    dispatchIpcEvent(
      webContentId,
      {
        type: "request",
        eventName: "ntApi",
      },
      {
        cmdName: "nodeIKernelMsgService/fetchMarketEmoticonAioImage",
        cmdType: "invoke",
        payload: [
          {
            marketEmoticonAioImageReq: {
              eId: marketFaceElement.emojiId,
              epId: marketFaceElement.emojiPackageId,
              name: marketFaceElement.faceName,
              width: marketFaceElement.imageHeight,
              height: marketFaceElement.imageHeight,
              jobType: 0,
              encryptKey: marketFaceElement.key,
              filePath: marketFaceElement.staticFacePath,
              downloadType: 4,
            },
          },
          undefined,
        ],
      },
      true
    );
  }
}

IpcInterceptor.interceptIpcSendEvents(
  "nodeIKernelMsgListener/onEmojiDownloadComplete",
  (channel: string, event: any, args: any) => {
    if (configManager.value.message.marketFaceToPicElement) {
      const filePath = args?.payload?.notifyInfo?.path;
      if (!filePath) return;
      const cb = awaitIsFileExist.get(filePath);
      if (cb) {
        cb();
        awaitIsFileExist.delete(filePath);
      } else {
        faceFilePaths.delete(filePath);
      }
    }
  }
);

IpcInterceptor.interceptIpcReceiveEvents("isFileExist", (_: any, __: any, channel: string, args: any) => {
  if (configManager.value.message.marketFaceToPicElement) {
    const webContentId = parseInt(channel.split("RM_IPCFROM_RENDERER")[1]) || 2;
    const callbackId = args?.[0]?.callbackId;
    const filePath = args?.[1]?.payload?.[0];
    if (filePath && faceFilePaths.has(filePath)) {
      faceFilePaths.delete(filePath);
      awaitIsFileExist.set(filePath, () => sendFileIsExist(webContentId, callbackId));
      return { action: "block" };
    }
  }
});

function sendFileIsExist(webContentId: number, callbackId: string) {
  const webContent = webContents.fromId(webContentId);
  if (webContent && callbackId) {
    webContent.send(
      `RM_IPCFROM_MAIN${webContentId}`,
      {
        callbackId,
        promiseStatue: "full",
        type: "response",
        eventName: "FileApi",
        peerId: webContentId,
      },
      true
    );
  }
}

export { convertMarketFaceToPic };
