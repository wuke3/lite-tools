import fs from "node:fs";
import path from "node:path";
import { dialog } from "electron";
import configTemplate from "@/config/main.template.json";

export class UserConfigRegistry {
  private userConfigRegistryPath: string;
  private configPath: string;
  private list: Map<string, string>;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.userConfigRegistryPath = path.join(this.configPath, "UserConfigRegistry.json");
    this.list = new Map();
    this.load();
  }

  private load() {
    if (fs.existsSync(this.userConfigRegistryPath)) {
      try {
        this.list = new Map(JSON.parse(fs.readFileSync(this.userConfigRegistryPath, "utf-8")));
      } catch {
        fs.renameSync(this.userConfigRegistryPath, `${this.userConfigRegistryPath}.bak`);
        this.list.clear();
        this.save();
        dialog.showMessageBox({
          type: "info",
          title: "[轻量工具箱] 配置文件损坏",
          message: "独立配置索引文件损坏，请重新配置",
          buttons: ["确定"],
        });
      }
    } else {
      this.save();
    }
  }

  get(uid: string) {
    const configPath = this.list.get(uid);
    if (configPath) {
      return configPath;
    } else {
      return this.create(uid);
    }
  }

  set(uid: string, configPath: string) {
    this.list.set(uid, configPath);
    this.save();
  }

  delete(uid: string) {
    this.list.delete(uid);
    this.save();
  }

  create(uid: string) {
    const dir = path.join(this.configPath, "configs");
    const configPath = path.join(dir, `${uid}.json`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(configTemplate, null, 2), "utf-8");
    }
    this.set(uid, configPath);
    return configPath;
  }

  private save() {
    fs.writeFileSync(this.userConfigRegistryPath, JSON.stringify([...this.list], null, 2), "utf-8");
  }
}
