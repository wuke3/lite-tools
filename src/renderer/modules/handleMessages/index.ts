import { onComponentMount } from "@/renderer/modules/vueComponentTracker";
import { checkChatType } from "@/common/checkChatType";
import { createLogger } from "@/renderer/utils/createLogger";
import { waitForInstance } from "@/renderer/utils/domWaitFor";
import { configStore } from "@/renderer/modules/configStore";

import { initRecallMessageListener, insertRecallTag } from "./messageRecall";
import { mergeMessage } from "./mergeMessage";
import { messageImageMask } from "./messageImageMask";
import { insertSlot } from "./messageSlot";
import { handleRedBag } from "./messageRedBag";

import type { MessageElement } from "./type";

const log = createLogger("handleMessages");

const processedInstances = new WeakSet<any>();

let aioData: any;

async function setupHandleMessages() {
  await configStore.ready;
  log("注册事件");
  onComponentMount(handleMessages);
  initRecallMessageListener(enhanceMessage);
  const { instance, value: msgList } = await waitForInstance(
    ".container-content .container .aio .group-chat",
    "proxy.curMsgListData"
  );
  aioData = instance.proxy;

  for (const item of msgList) {
    const el = document.getElementById(item.msgId)?.firstElementChild;
    if (el && el?.__VUE__?.[0]) {
      handleMessages(el.__VUE__[0]);
    }
  }
}

function enabledSlot() {
  return configStore.value.message.preventRecall.enabled;
}

function handleMessages(component: any) {
  if (component?.vnode?.el && component?.props?.msgRecord && !processedInstances.has(component)) {
    if (!checkChatType(component.props.msgRecord) || !component.vnode.el?.classList?.contains?.("message")) return;
    processedInstances.add(component);
    // 消息合并-有卡顿
    if (0) {
      mergeMessage(aioData, component);
    }
    // 插入插槽
    if (enabledSlot()) {
      enhanceMessage(component);
    }
    // 图片遮罩
    if (1) {
      messageImageMask(component);
    }
  }
}

function enhanceMessage(component: any) {
  const messageEl = component.vnode.el as any;
  const msgRecord = component.props.msgRecord;
  const slot = insertSlot(messageEl, msgRecord);
  if (configStore.value.message.preventRecall.enabled) {
    insertRecallTag(messageEl, msgRecord);
  }
  if (configStore.value.message.grabRedBag.enabled) {
    handleRedBag(msgRecord);
  }
}

export { setupHandleMessages };
