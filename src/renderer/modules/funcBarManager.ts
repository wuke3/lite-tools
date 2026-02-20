import { configStore } from "@/renderer/modules/configStore";
import { observeMutations } from "@/renderer/utils/observeMutations";
import { createLogger } from "@/renderer/utils/createLogger";

const log = createLogger("funcBarManager", true);
const topFuncMap = new Map() as Map<string, FuncBar>;
const chatFuncMap = new Map() as Map<string, FuncBar>;

let closeTopObserver: ReturnType<typeof observeMutations> | null = null;
let closeChatObserver: ReturnType<typeof observeMutations> | null = null;

async function updateTopFuncBar() {
  await configStore.ready;
  const funcs = Array.from(document.querySelectorAll<HTMLElement>(".panel-header__action .func-bar-native>div")).filter(
    (item) => item.style.display !== "none"
  );
  log("updateTopFuncBar", funcs);
  if (configStore.value.topFuncBar.length > 1) {
    log("hiddenFuncBtn-top");
    hiddenFuncBtn(funcs, configStore.value.topFuncBar);
  }

  initTopFuncBar(funcs);
  function initTopFuncBar(funcs: HTMLElement[]) {
    funcs.forEach((element) => {
      const id = element.id;
      const name = element.querySelector(".icon-item")?.getAttribute("aria-label") || "";
      if (!name) return;
      topFuncMap.set(id, {
        name,
        id,
      });
    });
    if (
      topFuncMap.size >= configStore.value.topFuncBar.length &&
      !isFuncCountEqual(topFuncMap, configStore.value.topFuncBar)
    ) {
      configStore.value.topFuncBar = Array.from(topFuncMap.values()).map((item) => {
        return {
          ...item,
          enabled: configStore.value.topFuncBar.find((i) => i.id === item.id)?.enabled ?? true,
        };
      });
      log("更新顶部栏目", configStore.value.topFuncBar);
      configStore.setConfig(configStore.value);
    }
  }

  closeTopObserver?.();
  closeTopObserver = observeMutations(
    document.querySelector(".panel-header__action .func-bar-native")!,
    () => {
      const funcs = Array.from(
        document.querySelectorAll<HTMLElement>(".panel-header__action .func-bar-native>div")
      ).filter((item) => item.style.display !== "none");
      initTopFuncBar(funcs);
      hiddenFuncBtn(funcs, configStore.value.topFuncBar);
    },
    {
      attributeFilter: ["style"],
      attributes: true,
      subtree: true,
      childList: true,
      autoDisconnect: 1000,
    }
  );

  hiddenFuncBtn(funcs, configStore.value.topFuncBar);
}

async function updateChatFuncBar() {
  await configStore.ready;
  const funcs = Array.from(document.querySelectorAll<HTMLElement>(".chat-func-bar .func-bar-native>div")).filter(
    (item) => item.style.display !== "none"
  );
  log("updateChatFuncBar", funcs);
  if (configStore.value.chatFuncBar.length > 1) {
    log("hiddenFuncBtn-chat");
    hiddenFuncBtn(funcs, configStore.value.chatFuncBar);
  }

  initChatFuncBar(funcs);
  function initChatFuncBar(funcs: HTMLElement[]) {
    funcs.forEach((element) => {
      const id = element.id;
      const name = element.querySelector(".icon-item")?.getAttribute("aria-label") || "";
      if (!name) return;
      chatFuncMap.set(id, {
        name,
        id,
      });
    });
    if (
      chatFuncMap.size >= configStore.value.chatFuncBar.length &&
      !isFuncCountEqual(chatFuncMap, configStore.value.chatFuncBar)
    ) {
      configStore.value.chatFuncBar = Array.from(chatFuncMap.values()).map((item) => {
        return {
          ...item,
          enabled: configStore.value.chatFuncBar.find((i) => i.id === item.id)?.enabled ?? true,
        };
      });
      log("更新聊天栏目", configStore.value.chatFuncBar);
      configStore.setConfig(configStore.value);
    }
  }

  closeChatObserver?.();
  closeChatObserver = observeMutations(
    document.querySelector(".chat-func-bar .func-bar-native:first-child")!,
    () => {
      const funcs = Array.from(document.querySelectorAll<HTMLElement>(".chat-func-bar .func-bar-native>div")).filter(
        (item) => item.style.display !== "none"
      );
      initChatFuncBar(funcs);
      hiddenFuncBtn(funcs, configStore.value.chatFuncBar);
    },
    {
      attributeFilter: ["style"],
      attributes: true,
      subtree: true,
      childList: true,
      autoDisconnect: 1000,
    }
  );

  hiddenFuncBtn(funcs, configStore.value.chatFuncBar);
}

function hiddenFuncBtn(elements: HTMLElement[], funcBar: FuncBar[]) {
  const map = new Map(funcBar.map((v) => [v.id, v.enabled]));
  for (const el of elements) {
    if (map.has(el.id)) {
      el.classList.toggle("lt-disabled", !map.get(el.id)!);
    }
  }
}

function isFuncCountEqual(a: Map<string, FuncBar>, b: FuncBar[]) {
  const mapB = new Map(b.map((item) => [item.id, item]));
  if (a.size !== mapB.size) return false;
  return [...mapB.keys()].every((id) => a.has(id));
}

export { updateTopFuncBar, updateChatFuncBar };
