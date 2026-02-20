import { ipcMain } from "electron";
import { extname } from "path";
import { rangesServer } from "./rangesServer";
import { configManager } from "@/main/modules/configManager";
import { globalBroadcast } from "@/main/utils/globalBroadcast";
import { createLogger } from "@/main/utils/createLogger";
import type { WallpaperData } from "@/common/types/wallpaper";

const log = createLogger("wallpaper");

class WallpaperService {
  private wallpaperData: WallpaperData = {
    type: "image",
    path: "",
    url: "",
  };
  private imgExt = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".avif"];
  private videoExt = [".mp4", ".webm"];
  private currentPath: string | null = null;

  setup() {
    configManager.onConfigUpdate(this.updateWallpaper.bind(this));
    ipcMain.on("lite_tools.getWallpaperData", () => {
      log("获取背景数据", this.wallpaperData);
      this.getWallpaperData();
    });
  }
  updateWallpaper() {
    const config = configManager.value as Config;
    if (!config.interface.wallpaper.enabled) {
      this.currentPath = null;
      rangesServer.stopServer();
    }
  }
  async getWallpaperData() {
    const config = configManager.value as Config;
    if (this.currentPath != config.interface.wallpaper.path) {
      this.currentPath = config.interface.wallpaper.path;
      if (this.imgExt.includes(extname(config.interface.wallpaper.path).toLocaleString())) {
        this.wallpaperData.type = "image";
        this.wallpaperData.path = config.interface.wallpaper.path;
        log("更新背景图片", this.wallpaperData);
      } else if (this.videoExt.includes(extname(config.interface.wallpaper.path))) {
        log("启动http服务");
        this.wallpaperData.type = "video";
        rangesServer.setFilePath(config.interface.wallpaper.path);
        const port = await rangesServer.startServer();
        const name = config.interface.wallpaper.path.split("/").pop()!;
        this.wallpaperData.url = `http://localhost:${port}/${name}`;
        log("更新背景视频", this.wallpaperData);
      } else {
        this.wallpaperData.type = "image";
        this.wallpaperData.path = "";
        log("不支持的文件格式", this.wallpaperData, config.interface.wallpaper);
      }
    }
    globalBroadcast("lite_tools.wallpaperChanged", this.wallpaperData);
  }
}

const wallpaperService = new WallpaperService();

export { wallpaperService };
