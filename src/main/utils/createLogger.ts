import { configManager } from "@/main/modules/configManager";

class LocalLogger {
  constructor(private moduleName: string) {}
  log = (...args: any[]) => {
    if (configManager.value?.debug?.mainConsole !== false) {
      console.log(`[${this.moduleName}]`, ...args);
    }
  };
}

function createLogger(moduleName: string, mute = false) {
  if (mute) {
    return () => {};
  }
  const logsInstance = "Logs" in globalThis ? new Logs(moduleName) : new LocalLogger(moduleName).log;
  return (...args: any[]) => {
    if (configManager.value?.debug?.mainConsole !== false) {
      logsInstance(...args);
    }
  };
}

export { createLogger };
