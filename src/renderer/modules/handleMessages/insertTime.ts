import { configStore } from "@/renderer/modules/configStore";
import { formatChineseDate } from "@/renderer/modules/handleMessages/formatChineseDate";

import type { SlotElement } from "./type";

const TIME_FORMAT_MAPPING: Record<string, "numeric" | "2-digit"> = {
  "1": "numeric",
  "2": "2-digit",
};

function insertTime(slot: SlotElement, msgRecord: any) {
  if (slot.querySelector(".lt-time")) return;
  const time = document.createElement("span");
  time.classList.add("lt-time");
  const sendTime = getSendTime(msgRecord.msgTime * 1000);
  time.textContent = sendTime;
  time.title = formatChineseDate(new Date(msgRecord.msgTime * 1000));
  const clone = time.cloneNode(true) as HTMLElement;
  const spacer = slot.children[0] as HTMLElement;
  const float = slot.children[1] as HTMLElement;
  spacer?.insertAdjacentElement("beforeend", time);
  float?.insertAdjacentElement("beforeend", clone);
}

function getSendTime(sendTime: number) {
  const cfg = configStore.value.message.showSendTime;
  return new Intl.DateTimeFormat("zh-CN", {
    year: TIME_FORMAT_MAPPING[cfg.dateFormat[0]],
    month: TIME_FORMAT_MAPPING[cfg.dateFormat[1]],
    day: TIME_FORMAT_MAPPING[cfg.dateFormat[2]],
    hour: TIME_FORMAT_MAPPING[cfg.timeFormat[0]],
    minute: TIME_FORMAT_MAPPING[cfg.timeFormat[1]],
    second: TIME_FORMAT_MAPPING[cfg.timeFormat[2]],
    timeZoneName: cfg.showTimeZone ? "shortOffset" : undefined,
  }).format(new Date(sendTime));
}

export { insertTime };
