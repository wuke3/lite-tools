import fs from "node:fs";
import path from "node:path";
import { dialog, ipcMain } from "electron";
import { configPath, dataPath } from "@/main/utils/pluginPaths";
import { UserConfigRegistry } from "@/main/modules/UserConfigRegistry";
import { globalBroadcast } from "@/main/utils/globalBroadcast";
import configTemplate from "@/config/main.template.json";

type ConfigListener = (config: Config) => void;

class ConfigManager {
  private isIndependent = false;
  private isInitialized = false;
  private config = {} as Config;
  private defaultConfigPath = path.join(configPath, "config.json");
  private currentConfigPath = "";
  private userUid = "";
  private listeners: Set<ConfigListener> = new Set();
  private readyPromise: Promise<void>;
  private resolveReady: () => void;
  private userConfigRegistry: UserConfigRegistry;

  constructor() {
    const { promise, resolve } = Promise.withResolvers<void>();
    this.readyPromise = promise;
    this.resolveReady = resolve;
    this.setupPath();
    this.setupIpcEvent();
    this.userConfigRegistry = new UserConfigRegistry(configPath);
  }

  private setupIpcEvent() {
    ipcMain.on("lite_tools.isIndependent", (event) => {
      event.returnValue = this.isIndependent;
    });
    ipcMain.on("lite_tools.isInitialized", (event) => {
      event.returnValue = this.isInitialized;
    });
    ipcMain.handle("lite_tools.getConfig", () => {
      return this.config;
    });
    ipcMain.on("lite_tools.updateConfig", (_, data) => {
      this.updateConfig(data);
    });
  }

  private setupPath() {
    try {
      if (!fs.existsSync(configPath)) {
        fs.mkdirSync(path.join(configPath, "configs"), { recursive: true });
      }
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
    } catch (err) {
      dialog.showMessageBox({
        type: "info",
        title: "[轻量工具箱] 路径错误",
        message: "无法访问配置文件路径，请检查路径是否存在，或读写权限是否正确",
        buttons: ["确定"],
      });
      throw err;
    }
  }

  private safeMergeConfig<T>(userConfig: Partial<T>, baseConfig: T): T {
    if (!userConfig || typeof userConfig !== "object") return baseConfig;
    const result: Partial<T> = {};
    for (const key in baseConfig) {
      const k = key as keyof T;
      const baseValue = baseConfig[k];
      const userValue = userConfig[k];
      if (baseValue && typeof baseValue === "object" && baseValue !== null && !Array.isArray(baseValue)) {
        if (!userValue || typeof userValue !== "object") {
          result[k] = baseValue;
        } else {
          result[k] = this.safeMergeConfig(userValue, baseValue);
        }
      } else {
        result[k] = typeof userValue === typeof baseValue ? userValue : baseValue;
      }
    }
    return result as T;
  }

  private loadConfig(configPath: string): BaseConfig {
    try {
      if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify(configTemplate, null, 2), "utf-8");
        return configTemplate;
      }
      return this.safeMergeConfig(JSON.parse(fs.readFileSync(configPath, "utf-8")), configTemplate);
    } catch (err) {
      dialog.showMessageBox({
        type: "info",
        title: "[轻量工具箱] 配置文件损坏",
        message: "用户配置文件损坏，请重新配置",
        buttons: ["确定"],
      });
      fs.renameSync(configPath, `${configPath}.bak`);
      fs.writeFileSync(configPath, JSON.stringify(configTemplate, null, 2), "utf-8");
      return configTemplate;
    }
  }

  setup(uid: string) {
    try {
      const userConfigPath = this.userConfigRegistry.get(uid);
      this.userUid = uid;
      if (userConfigPath) {
        this.config = this.loadConfig(userConfigPath);
        this.currentConfigPath = userConfigPath;
        this.isInitialized = true;
        this.isIndependent = true;
      } else {
        this.config = this.loadConfig(this.defaultConfigPath);
        this.currentConfigPath = this.defaultConfigPath;
        this.isInitialized = true;
      }
      this.resolveReady();
    } catch (err) {}
  }

  updateConfig(newConfig: Config) {
    Object.assign(this.config, newConfig);
    fs.writeFileSync(this.currentConfigPath, JSON.stringify(this.config, null, 2), "utf-8");
    for (const listener of this.listeners) {
      listener(this.config);
    }
    globalBroadcast("lite_tools.configChanged", this.config);
  }

  onConfigUpdate(listener: ConfigListener) {
    this.listeners.add(listener);
    return () => this.offConfigUpdate(listener);
  }

  offConfigUpdate(listener: ConfigListener) {
    this.listeners.delete(listener);
  }

  get value(): Readonly<Config> {
    return this.config;
  }

  get ready() {
    return this.readyPromise;
  }

  get uid() {
    return this.userUid;
  }
}

const configManager = new ConfigManager();
export { configManager };
