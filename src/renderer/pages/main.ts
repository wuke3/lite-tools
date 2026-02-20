import { aioStore } from "@/renderer/modules/aioStore";
import { createLogger } from "@/renderer/utils/createLogger";
import { configStore } from "@/renderer/modules/configStore";
import { createComparator } from "@/common/createComparator";
import { updateTopFuncBar, updateChatFuncBar } from "@/renderer/modules/funcBarManager";
import { observeMutations } from "@/renderer/utils/observeMutations";
import { setupHandleMessages } from "@/renderer/modules/handleMessages";
import { onComponentMount } from "@/renderer/modules/vueComponentTracker";
import { waitForInstance } from "@/renderer/utils/domWaitFor";
import { wallpaperManager } from "@/renderer/modules/wallpaperManager";
import { initDebugFeatures } from "@/renderer/modules/debugFeatures";
import { initTimeFeatures } from "@/renderer/modules/timeDisplay";

const log = createLogger("main");

async function setupMainPage() {
  log("await init");
  await configStore.ready;
  await aioStore.ready;
  const topSideBarhasChanged = createComparator(configStore.value.sideBar.top);
  updateTopSideBar(configStore.value);
  updateBottomSideBar(configStore.value);
  updateInterface(configStore.value);
  updateRecallConfig(configStore.value);
  setupHandleMessages();
  setupIpcToBroadcast();
  wallpaperManager.setup();
  initDebugFeatures();
  initTimeFeatures();
  aioStore.onChange(() => {
    updateTopFuncBar();
    updateChatFuncBar();
  });
  configStore.onChange((config) => {
    log("config changed", config);
    if (topSideBarhasChanged(config.sideBar.top)) {
      updateTopSideBar(config);
    }
    updateInterface(config);
    updateBottomSideBar(config);
    updateTopFuncBar();
    updateChatFuncBar();
    updateRecallConfig(config);
  });
  onComponentMount((component) => {
    if (configStore.value.interface.hiddenLockBtn && component?.vnode?.key === "锁定") {
      component.vnode.el.style.display = "none";
    }
    if (configStore.value.interface.hiddenLogoutBtn && component?.vnode?.key === "退出账号") {
      component.vnode.el.style.display = "none";
    }
    if (configStore.value.interface.hiddenUpdateBtnAndNotice && component?.vnode?.key === "检查更新") {
      component.vnode.el.style.display = "none";
    }
    if (configStore.value.interface.hiddenChatRecordManager && component?.vnode?.key === "聊天记录管理") {
      component.vnode.el.style.display = "none";
    }
    if (configStore.value.interface.hiddenHelp && component?.vnode?.key === "帮助") {
      component.vnode.el.style.display = "none";
    }
  });
  observeMutations(
    document.querySelector(".nav.sidebar__nav")!,
    (mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          updateTopSideBar(configStore.value);
          updateBottomSideBar(configStore.value);
        }
      }
    },
    { childList: true, autoDisconnect: 5000 }
  );
  log("initialized");
}

function updateRecallConfig(config: Config) {
  document.body.classList.toggle("lt-custom-recall-color", config.message.preventRecall.customColor);
  document.body.style.setProperty("--lt-recall-color", config.message.preventRecall.customTextColor);
  document.body.style.setProperty("--lt-reedit-color", config.message.preventRecall.reeditTextColor);
}

function updateInterface(config: Config) {
  document
    .querySelector<HTMLElement>(".window-control-area .narrow-toggler")
    ?.style.setProperty("display", config.interface.hiddenClassicBtn ? "none" : "flex");
  document.body.classList.toggle("lt-remove-vip-color", config.interface.removeVipColor);
  document.body.classList.toggle("lt-hide-lock-btn", config.interface.hiddenLockBtn);
  document.body.classList.toggle("lt-hide-logout-btn", config.interface.hiddenLogoutBtn);
  document.body.classList.toggle("lt-hide-update-btn", config.interface.hiddenUpdateBtnAndNotice);
  document.body.classList.toggle("lt-hide-chat-record-manager", config.interface.hiddenChatRecordManager);
  document.body.classList.toggle("lt-hide-help", config.interface.hiddenHelp);
  document.body.classList.toggle("lt-show-all-elements", config.debug.enabled && config.debug.showAllElements);
  
  document
    .querySelectorAll<HTMLElement>('.sidebar-wrapper .sidebar__lower .more-h-menu-item:has([aria-label="锁定"])')
    .forEach((el) => el.style.display = config.interface.hiddenLockBtn ? "none" : "flex");
  document
    .querySelectorAll<HTMLElement>('.sidebar-wrapper .sidebar__lower .more-h-menu-item:has([aria-label="退出账号"])')
    .forEach((el) => el.style.display = config.interface.hiddenLogoutBtn ? "none" : "flex");
  document
    .querySelectorAll<HTMLElement>('.sidebar-wrapper .sidebar__lower .more-h-menu-item:has([aria-label="检查更新"])')
    .forEach((el) => el.style.display = config.interface.hiddenUpdateBtnAndNotice ? "none" : "flex");
  document
    .querySelectorAll<HTMLElement>('.sidebar-wrapper .sidebar__lower .more-h-menu-item:has([aria-label="聊天记录管理"])')
    .forEach((el) => el.style.display = config.interface.hiddenChatRecordManager ? "none" : "flex");
  document
    .querySelectorAll<HTMLElement>('.sidebar-wrapper .sidebar__lower .more-h-menu-item:has([aria-label="帮助"])')
    .forEach((el) => el.style.display = config.interface.hiddenHelp ? "none" : "flex");
  
  const controlAreaWidth = document.querySelector<HTMLElement>(".window-control-area")?.offsetWidth;
  if (controlAreaWidth) {
    document
      .querySelector<HTMLElement>(".topbar.container-topbar .topbar-content")
      ?.style.setProperty("padding-right", `${controlAreaWidth - 10}px`);
  }
}

function updateTopSideBar(config: Config) {
  // 更新侧边栏
  const sideBarUpper = document.querySelector<HTMLElement>(".sidebar-wrapper .sidebar__upper")!;
  sideBarUpper.querySelector(".nav.sidebar__nav")?.__VUE__?.[0]?.proxy?.navStore?.loadSideBarConfig();
  // 处理所有侧边栏项目
  for (const item of config.sideBar.top) {
    if (item.name && item.id !== -1) {
      sideBarUpper
        .querySelector<HTMLElement>(`.nav.sidebar__nav .nav-item[aria-label="${item.name}"]`)
        ?.style.setProperty("display", item.enabled ? "flex" : "none");
    }
  }
  // 特殊栏目
  sideBarUpper
    .querySelector<HTMLElement>(`.nav.sidebar__nav .nav-item[aria-label="消息"]`)
    ?.style.setProperty("display", config.sideBar.top[0].enabled ? "flex" : "none");
  sideBarUpper
    .querySelector<HTMLElement>(`.nav.sidebar__nav .nav-item[aria-label="联系人"]`)
    ?.style.setProperty("display", config.sideBar.top[1].enabled ? "flex" : "none");
  sideBarUpper
    .querySelector<HTMLElement>(`.nav.sidebar__nav .nav-item[aria-label="更多"]`)
    ?.style.setProperty("display", config.sideBar.top[config.sideBar.top.length - 1].enabled ? "flex" : "none");
}

function updateBottomSideBar(config: Config) {
  const sideBarLower = document.querySelector<HTMLElement>(".sidebar-wrapper .sidebar__lower")!;
  for (const item of config.sideBar.bottom) {
    sideBarLower
      .querySelector<HTMLElement>(`.more-h-menu-item:has([aria-label="${item.name}"])`)
      ?.style.setProperty("display", item.enabled ? "flex" : "none");
  }
}

function setupIpcToBroadcast() {
  lite_tools.onBroadcast((channelName, payload) => {
    const broadcast = new BroadcastChannel(channelName);
    broadcast.postMessage(payload);
    broadcast.close();
  });
}

export { setupMainPage };
