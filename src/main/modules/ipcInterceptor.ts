import { createLogger } from "@/main/utils/createLogger";
import { configManager } from "@/main/modules/configManager";

const log = createLogger("ipcInterceptor");

function setupIpcInterceptor() {
  IpcInterceptor.interceptIpcSendEvents("nodeIKernelUnitedConfigListener/onUnitedConfigUpdate", (...args) => {
    log("onUnitedConfigUpdate", args);
    if (
      configManager.value.interface.hiddenUpdateBtnAndNotice &&
      ["100084", "100243"].includes(args?.[2]?.payload?.configData?.group)
    ) {
      return {
        action: "block",
      };
    }
  });
}

export { setupIpcInterceptor };
