import { pluginPath } from "@/renderer/utils/pluginPaths";
import { join, resolvePath } from "@/renderer/utils/pathUtils";

class StyleManager {
  private basePath: string = join(pluginPath, "dist", "css");
  async inject(cssName: string) {
    const cssPath = resolvePath(join(this.basePath, `${cssName}.css`));
    const ltCssName = CSS.escape(cssName);
    // 不重复添加样式
    if (document.querySelector(`link[data-lt-css-name="${CSS.escape(cssName)}"]`)) {
      return;
    }
    if (await this.checkFile(cssPath)) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.type = "text/css";
      style.href = cssPath;
      style.dataset.ltCssName = ltCssName;
      document.head.appendChild(style);
      if (__DEV__) {
        const currentStyle = await this.getFile(`${cssPath}?t=${Date.now()}`);
        this.loopCheck(currentStyle, style, cssPath);
      }
    } else {
      console.error(`[StyleManager] ${cssName}.css not found`);
    }
  }
  remove(cssName: string) {
    const style = document.querySelector(`link[data-lt-css-name="${CSS.escape(cssName)}"]`);
    if (style) {
      style.remove();
    }
  }
  async checkFile(cssPath: string) {
    try {
      const res = await fetch(cssPath, { method: "HEAD" });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  async getFile(cssPath: string) {
    return await fetch(cssPath).then((res) => res.text());
  }

  async loopCheck(currentStyle: string, style: HTMLLinkElement, cssPath: string) {
    try {
      if (!style.isConnected) {
        return;
      }
      const nextStyle = await this.getFile(`${cssPath}?t=${Date.now()}`);
      if (currentStyle !== nextStyle) {
        style.href = `${cssPath}?t=${Date.now()}`;
        currentStyle = nextStyle;
      }
    } finally {
      setTimeout(() => {
        this.loopCheck(currentStyle, style, cssPath);
      }, 1000);
    }
  }
}

const styleManager = new StyleManager();
export { styleManager };
