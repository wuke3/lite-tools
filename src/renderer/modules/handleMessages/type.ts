interface SlotElement extends HTMLElement {
  updatePosition?: () => Promise<void>;
}

interface MessageElement extends HTMLElement {
  lt_slot: SlotElement;
}

export type { SlotElement, MessageElement };
