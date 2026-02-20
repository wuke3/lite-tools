import { createLogger } from "@/renderer/utils/createLogger";

const log = createLogger("nativeCall");

/**
 *
 * @param {Array} message 消息链
 * @returns
 */
async function convertMessage(message: any) {
  switch (message.type) {
    case "text":
      return {
        elementType: 1,
        elementId: "",
        textElement: {
          content: message.content,
          atType: 0,
          atUid: "",
          atTinyId: "",
          atNtUid: "",
        },
      };
    case "image": {
      const path = message.path;
      await lite_tools.nativeCall(
        {
          type: "request",
          eventName: "FileApi",
        },
        {
          cmdName: "getFileType",
          cmdType: "invoke",
          payload: [path],
        },
        true
      );
      const copyFile = (await lite_tools.nativeCall(
        {
          type: "request",
          eventName: "ntApi",
        },
        {
          cmdName: "nodeIKernelMsgService/copyFileWithDelExifInfo",
          cmdType: "invoke",
          payload: [
            {
              sourcePath: path,
              elementSubType: 1,
            },
            null,
          ],
        },
        true
      )) as any;
      log("复制路径", copyFile);
      const fileType = (await lite_tools.nativeCall(
        {
          type: "request",
          eventName: "FileApi",
        },
        {
          cmdName: "getFileType",
          cmdType: "invoke",
          payload: [copyFile.newPath],
        },
        true
      )) as any;
      const imageSize = (await lite_tools.nativeCall(
        {
          type: "request",
          eventName: "FileApi",
        },
        {
          cmdName: "getImageSizeFromPath",
          cmdType: "invoke",
          payload: [copyFile.newPath],
        },
        true
      )) as any;
      lite_tools.nativeCall(
        {
          type: "request",
          eventName: "FileApi",
        },
        {
          cmdName: "getFileMd5",
          cmdType: "invoke",
          payload: [copyFile.newPath],
        }
      );
      const fileSize = await lite_tools.nativeCall(
        {
          type: "request",
          eventName: "FileApi",
        },
        {
          cmdName: "getFileSize",
          cmdType: "invoke",
          payload: [copyFile.newPath],
        },
        true
      );

      const picElement = {
        md5HexStr: copyFile.md5,
        picWidth: imageSize.width,
        picHeight: imageSize.height,
        fileName: getFileName(copyFile.newPath),
        fileSize: fileSize,
        original: true,
        picType: fileType.ext === "gif" ? 2000 : 1000,
        picSubType: message.picSubType,
        sourcePath: copyFile.newPath,
        fileUuid: "",
        fileSubId: "",
        thumbFileSize: 0,
        thumbPath: undefined,
        summary: "",
      };
      const messageChannel = {
        elementType: 2,
        elementId: "",
        extBufForUI: new Uint8Array(),
        picElement,
      };
      return messageChannel;
    }
    default:
      return null;
  }
}

function getFileName(path: string) {
  if (typeof path !== "string") return "";
  // 去掉末尾的斜杠或反斜杠
  const trimmed = path.replace(/[\/\\]+$/, "");
  if (trimmed === "") return "";
  // 找最后一个分隔符的位置
  const idx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const name = idx === -1 ? trimmed : trimmed.slice(idx + 1);
  // Windows 驱动器根如 "C:" 也不是文件名
  if (/^[A-Za-z]:$/.test(name)) return "";
  return name;
}

async function sendMessage(peer: Peer, messages: any[]) {
  log("发送消息", peer, messages);
  lite_tools.nativeCall(
    {
      eventName: "ntApi",
      type: "request",
    },
    {
      cmdName: "nodeIKernelMsgService/sendMsg",
      cmdType: "invoke",
      payload: [
        {
          msgId: "0",
          peer,
          msgElements: await Promise.all(messages.map((message) => convertMessage(message))),
          msgAttributeInfos: new Map(),
        },
        null,
      ],
    }
  );
}

function forwardMessage(srcpeer: Peer, dstpeer: Peer, msgIds: any) {
  log("转发消息", srcpeer, dstpeer, msgIds);
  lite_tools.nativeCall(
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelMsgService/forwardMsgWithComment",
      cmdType: "ntApi",
      payload: [
        {
          commentElements: [],
          dstContacts: [dstpeer],
          msgAttributeInfos: new Map(),
          msgIds,
          srcContact: srcpeer,
        },
        null,
      ],
    }
  );
}

function getUserInfo(uid: string) {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelProfileService/fetchUserDetailInfo",
      cmdType: "invoke",
      payload: [
        {
          callFrom: "BuddyProfileStore",
          uid,
          bizList: [0],
          source: 0,
        },
        null,
      ],
    },
    ["nodeIKernelProfileListener/onProfileDetailInfoChanged", "nodeIKernelProfileListener/onProfileSimpleChanged"]
  );
}

function getMembersAvatar(uids: string[]) {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelAvatarService/getMembersAvatarPath",
      cmdType: "invoke",
      payload: [
        {
          uids,
          clarity: 1,
        },
      ],
    },
    true
  );
}

function getGroupsAvatar(groupCodes: string[]) {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelAvatarService/getConfGroupsAvatarPath",
      cmdType: "invoke",
      payload: [
        {
          groupCodes,
          clarity: 1,
        },
      ],
    },
    true
  );
}

function goMainWindowScene(sceneData: any) {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "WindowApi",
    },
    {
      cmdName: "nodeIKernelAvatarService/getConfGroupsAvatarPath",
      cmdType: "invoke",
      payload: [
        {
          scene: sceneData.scene,
          sceneParams: {
            peerUid: sceneData.peerUid,
            chatType: sceneData.chatType,
            type: sceneData.type,
            params: {
              msgId: sceneData.msgId,
            },
          },
        },
      ],
    }
  );
}

function getGroupInfo(groupCode: string) {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelGroupService/getGroupDetailInfo",
      cmdType: "invoke",
      payload: [
        {
          groupCode,
          source: 4,
        },
        null,
      ],
    }
  );
}

function activeChatAndReturnPreview(peer: Peer) {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelMsgService/getAioFirstViewLatestMsgsAndAddActiveChat",
      cmdType: "invoke",
      payload: [
        {
          peer,
          cnt: 10,
        },
        null,
      ],
    }
  );
}

/**
 * 获取记录的账号 - 登录界面选择账号列表
 */
function getLoginList() {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelLoginService/getLoginList",
      cmdType: "invoke",
      payload: [null, null],
    }
  );
}

/**
 * 获取当前登录账号信息
 */
function getAuthData() {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "GlobalDataApi",
    },
    {
      cmdName: "fetchAuthData",
      cmdType: "invoke",
      payload: [],
    }
  );
}

/**
 * 移除账号登录信息
 * @param {String} uin 账号uin
 * @returns
 */
function resetLoginInfo(uin: string) {
  return lite_tools.nativeCall(
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelLoginService/deleteLoginInfo",
      cmdType: "invoke",
      payload: [
        {
          uin,
        },
        null,
      ],
    }
  );
}

export {
  sendMessage,
  forwardMessage,
  goMainWindowScene,
  getUserInfo,
  getMembersAvatar,
  getGroupsAvatar,
  getGroupInfo,
  getAuthData,
  activeChatAndReturnPreview,
  getLoginList,
  resetLoginInfo,
};
