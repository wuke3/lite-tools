import type { MessageElement } from "./type";

function mergeMessage(aioData: any, component: any) {
  const messageEl = component.vnode.el as MessageElement;
  const msgRecord = component.props.msgRecord;
  for (let i = 0; i < aioData.curMsgListData.length; i++) {
    const item = aioData.curMsgListData[i];
    if (item.msgId === msgRecord.msgId) {
      item._ltMsgEl = messageEl as HTMLElement;
    }
    if (item._ltMsgEl) {
      if (aioData.curMsgListData[i - 1]?.senderUid === item?.senderUid) {
        item._ltMsgEl.classList.add("lt-msg-child");
        item._ltMsgEl.classList.remove("lt-msg-main");
      } else {
        item._ltMsgEl.classList.add("lt-msg-main");
        item._ltMsgEl.classList.remove("lt-msg-child");
        if (!item._ltMsgEl.querySelector(".avatar-sticky") && item._ltMsgEl.querySelector(".avatar-span")) {
          const avatarEl = item._ltMsgEl.querySelector(".avatar-span .avatar");
          const el = document.createElement("div");
          el.classList.add("avatar-sticky");
          el.append(avatarEl!);
          item._ltMsgEl.querySelector(".avatar-span").appendChild(el);
        }
      }
    }
  }
}

export { mergeMessage };
