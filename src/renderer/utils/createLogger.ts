import { configStore } from "@/renderer/modules/configStore";

const logList: { name: string; log: any[] }[] = [];

let config: Config | null = null;

// 异步初始化 config
const logsReady = (async () => {
  await configStore.ready;
  config = configStore.value;
})();

// 日志类
class Logs {
  moduleName: string;
  private cachedLogs: any[][] = [];

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  logToConsole = (...args: any[]) => {
    if (!config) {
      this.cachedLogs.push(args);
      return;
    }

    if (config.debug.console) {
      console.log(`[${this.moduleName}]`, ...args);
      this.saveToLogList(args);
    }

    if (this.cachedLogs.length > 0) {
      if (!config.debug.console) {
        this.cachedLogs = [];
        return;
      }
      for (const logArgs of this.cachedLogs) {
        console.log(`[${this.moduleName}]`, ...logArgs);
        this.saveToLogList(logArgs);
      }
      this.cachedLogs = [];
    }
  };

  private saveToLogList(logData: any[]) {
    logList.push({ name: this.moduleName, log: logData });
  }
}

// 全局函数
window.lt_logs = () => {
  logsReady.then(() => {
    if (config?.debug.console) {
      for (const el of logList) {
        console.log(`[${el.name}]`, ...el.log);
      }
      console.log("[日志模块]", "log-end");
    } else {
      console.log("[日志模块]", "当前没有启用debug");
    }
  });
};

export function createLogger(moduleName: string, mute = false) {
  if (mute) {
    return () => {};
  }
  return new Logs(moduleName).logToConsole;
}
