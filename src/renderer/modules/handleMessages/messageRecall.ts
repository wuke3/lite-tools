import { formatChineseDate } from "@/renderer/modules/handleMessages/formatChineseDate";

import type { SlotElement } from "./type";

function insertRecallTag(messageEl: HTMLElement, msgRecord: any) {
  if (msgRecord.lt_recall) {
    if (messageEl.querySelector(".lt-recall-container")) return;
    
    const container = document.createElement("div");
    container.classList.add("lt-recall-container");
    
    const span = document.createElement("span");
    span.classList.add("lt-recall-avatar");
    span.textContent = "已撤回";
    span.title = `${formatChineseDate(new Date(msgRecord.msgTime * 1000))} 被 ${
      msgRecord.lt_recall.operatorRemark || msgRecord.lt_recall.operatorMemRemark || msgRecord.lt_recall.operatorNick
    } 撤回`;
    
    container.appendChild(span);
    
    let hasText = false;
    try {
      const elements = msgRecord.elements || [];
      for (const element of elements) {
        if (element?.textElement?.content) {
          hasText = true;
          break;
        }
      }
    } catch (e) {
      hasText = false;
    }
    
    if (hasText) {
      const reeditBtn = document.createElement("span");
      reeditBtn.classList.add("lt-reedit-btn");
      reeditBtn.textContent = "重新编辑";
      reeditBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        insertTextToInput(messageEl, msgRecord);
      });
      container.appendChild(reeditBtn);
    }
    
    const msgContentContainer = messageEl.querySelector(".msg-content-container");
    if (msgContentContainer) {
      (msgContentContainer as HTMLElement).style.position = "relative";
      msgContentContainer.insertAdjacentElement("beforeend", container);
    }
  }
}

function insertTextToInput(messageEl: HTMLElement, msgRecord: any) {
  const inputEditor = document.querySelector(".ProseMirror.ExEditor-qq-msg-editor");
  if (!inputEditor) return;
  
  const messageContent = messageEl.querySelector(".message-content");
  if (!messageContent) return;
  
  const html = messageContent.innerHTML;
  
  const selection = window.getSelection();
  if (!selection) return;
  
  const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  
  (inputEditor as HTMLElement).focus();
  
  setTimeout(async () => {
    try {
      const blob = new Blob([html], { type: "text/html" });
      const data = [new ClipboardItem({ "text/html": blob })];
      await navigator.clipboard.write(data);
    } catch (e) {
      console.error("Copy failed:", e);
    }
    
    try {
      const range = document.createRange();
      range.selectNodeContents(inputEditor);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("paste");
    } catch (e) {
      console.error("Paste failed:", e);
    }
    
    selection.removeAllRanges();
    if (savedRange) {
      selection.addRange(savedRange);
    }
  }, 50);
}

function initRecallMessageListener(processMessages: any) {
  lite_tools.onRecallMessagesFound((recallMsgIds) => {
    for (const recallMsgId of recallMsgIds) {
      const recallMsg = document.getElementById(recallMsgId)?.firstElementChild;
      if (recallMsg && recallMsg?.__VUE__?.[0]) {
        processMessages(recallMsg.__VUE__[0]);
      }
    }
  });
}

export { initRecallMessageListener, insertRecallTag };
