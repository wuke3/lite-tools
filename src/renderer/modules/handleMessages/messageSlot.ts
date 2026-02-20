import { waitForInstance } from "@/renderer/utils/domWaitFor";

import { ElementType } from "./ElementTypeEnum";

import type { MessageElement, SlotElement } from "./type";

const embedElementType = [ElementType.textElement, ElementType.replyElement];
const ignoreElementType = [ElementType.grayTipElement];

function insertSlot(messageEl: MessageElement, msgRecord: any) {
  if (messageEl.lt_slot) {
    return messageEl.lt_slot;
  }
  const slot = createSlot();
  if (
    msgRecord.elements.length > 1 ||
    msgRecord.elements.some(
      (element: any) =>
        embedElementType.includes(element.elementType) ||
        (element.elementType === ElementType.faceElement && [1, 2].includes(element.faceElement.faceType))
    )
  ) {
    messageEl.lt_slot = slot;
    slot.classList.add("embed");
    messageEl.querySelector(".message-content:is(.mix-message__inner,.reply-message__inner)")?.appendChild(slot);
    return slot;
  } else if (
    msgRecord.elements.length === 1 &&
    msgRecord.elements[0].elementType === ElementType.picElement &&
    [0, 1].includes(msgRecord.elements[0].picElement.picSubType)
  ) {
    messageEl.lt_slot = slot;
    const isFace =
      msgRecord.elements[0].picElement.picSubType === 1 || msgRecord.elements[0].picElement.picType === 2000;
    slot.classList.add("embed-image");
    messageEl.querySelector(".message-content.mix-message__inner .image.pic-element")?.appendChild(slot);
    slot.updatePosition = async () => {
      const { value: size } = await waitForInstance(
        messageEl.querySelector<HTMLElement>(".message-content.mix-message__inner .image.pic-element")!,
        "proxy.size"
      );
      slot.classList.add("f-show");
      const { width, height } = size;
      const maxSize = Math.max(width, height, 150);
      const faceScale = 150 / maxSize;
      const faceWidth = width * faceScale;
      const _width = isFace ? Math.min(150, faceWidth) : width;
      if (_width <= slot.offsetWidth + 30) {
        slot.classList.remove("embed-image");
        slot.classList.add("outside");
        if (!messageEl.querySelector(".content-status.no-copy")) {
          const div = document.createElement("div");
          div.classList.add("content-status", "no-copy", "lt-add");
          messageEl.querySelector(".message-content__wrapper")?.insertAdjacentElement("afterend", div);
        }
        messageEl.querySelector(".content-status.no-copy")?.appendChild(slot);
      }
      slot.classList.remove("f-show");
    };
    return slot;
  } else if (!msgRecord.elements.some((item: any) => ignoreElementType.includes(item.elementType))) {
    messageEl.lt_slot = slot;
    slot.classList.add("outside");
    if (!messageEl.querySelector(".content-status.no-copy")) {
      const div = document.createElement("div");
      div.classList.add("content-status", "no-copy", "lt-add");
      messageEl.querySelector(".message-content__wrapper")?.insertAdjacentElement("afterend", div);
    }
    messageEl.querySelector(".content-status.no-copy")?.appendChild(slot);
    return slot;
  }
  return null;
}

function createSlot() {
  const slot = document.createElement("div");
  slot.classList.add("lt-slot");
  const spacer = document.createElement("div");
  const float = document.createElement("div");
  spacer.classList.add("lt-spacer");
  float.classList.add("lt-float");
  slot.append(spacer, float);
  return slot as SlotElement;
}

export { createSlot, insertSlot };
