import { aioStore } from "@/renderer/modules/aioStore";
import { createLogger } from "@/renderer/utils/createLogger";
import { configStore } from "@/renderer/modules/configStore";
import { updateTopFuncBar, updateChatFuncBar } from "@/renderer/modules/funcBarManager";
import { setupHandleMessages } from "@/renderer/modules/handleMessages";
import { wallpaperManager } from "@/renderer/modules/wallpaperManager";

const log = createLogger("chat");

async function setupChatPage() {
  log("await init");
  await configStore.ready;
  log("获取到配置", configStore.value);
  await aioStore.ready;
  log("initialized");
  setupHandleMessages();
  updateTopFuncBar();
  updateChatFuncBar();
  updateRecallConfig(configStore.value);
  updateInterface(configStore.value);
  wallpaperManager.setup();
  aioStore.onChange(() => {
    updateTopFuncBar();
    updateChatFuncBar();
  });
  configStore.onChange((config) => {
    updateTopFuncBar();
    updateChatFuncBar();
    updateRecallConfig(config);
    updateInterface(config);
  });
}

function updateInterface(config: Config) {
  document.body.classList.toggle("lt-remove-vip-color", config.interface.removeVipColor);
}

function updateRecallConfig(config: Config) {
  document.body.classList.toggle("lt-custom-recall-color", config.message.preventRecall.customColor);
  document.body.style.setProperty("--lt-recall-color-light", (config.message.preventRecall.customTextColor as any).light);
  document.body.style.setProperty("--lt-recall-color-dark", (config.message.preventRecall.customTextColor as any).dark);
}

export { setupChatPage };
