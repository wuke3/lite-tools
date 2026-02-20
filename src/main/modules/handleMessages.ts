import { configManager } from "@/main/modules/configManager";
import { checkChatType } from "@/common/checkChatType";
import { findEvent } from "@/main/utils/findEvent";
import { createLogger } from "@/main/utils/createLogger";
import { convertMiniArkToWebArk } from "@/main/modules/convertMiniArkToWebArk";
import { convertMarketFaceToPic } from "@/main/modules/convertMarketFaceToPic";
import { preventRecall } from "@/main/modules/preventRecall";

const log = createLogger("handleMessages",true);

function handleMessages(...args: any[]) {
  try {
    const channel = args[0] as string;
    const webContentId = parseInt(channel.split("RM_IPCFROM_MAIN")[1]) || 2;
    const msgList = args[2]?.msgList;
    if (msgList && msgList.length && checkChatType(msgList[0])) {
      processMessages(msgList, webContentId, args);
    }
    const onRecvMsg = findEvent(args, [
      "nodeIKernelMsgListener/onRecvMsg",
      "nodeIKernelMsgListener/onRecvActiveMsg",
      "nodeIKernelMsgListener/onMsgInfoListUpdate",
      "nodeIKernelMsgListener/onActiveMsgInfoUpdate",
    ]);
    if (onRecvMsg && checkChatType(args?.[2]?.payload?.msgList?.[0])) {
      processMessages(args[2].payload.msgList, webContentId, args);
    }
    const onForwardMsg = findEvent(args, "nodeIKernelMsgListener/onAddSendMsg");
    if (onForwardMsg && checkChatType(args?.[2]?.payload?.msgRecord)) {
      processMessages([args[2].payload.msgRecord], webContentId, args);
    }
  } catch (err: any) {
    log("出现错误", err.message, err?.stack);
  }
}

function processMessages(msgList: any[], webContentId: number, args: any[]) {
  try {
    const config = configManager.value;
    log("捕获到消息", msgList);
    if (config.message.preventRecall.enabled) {
      log("执行 阻止撤回 ");
      preventRecall(msgList);
    }
    if (config.message.miniArkToWebArk) {
      log("执行 替换小程序卡片 ");
      convertMiniArkToWebArk(msgList);
    }
    if (config.message.marketFaceToPicElement) {
      log("执行 转换表情类型 ");
      convertMarketFaceToPic(msgList, webContentId);
    }
    log("处理结束", msgList);
  } catch (err: any) {
    log("出现错误", err.message, err?.stack);
  }
}

function setupHandleMessages() {
  IpcInterceptor.interceptIpcSend(handleMessages);
  log("注册事件");
}

export { setupHandleMessages };
