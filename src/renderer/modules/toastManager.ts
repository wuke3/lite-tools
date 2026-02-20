import { importTextAsset } from "@/renderer/utils/importAsset.js";

// 导入路径保持不变
import taostContentPath from "@/assets/html/toast/toastContentEl.html";
import toastPath from "@/assets/html/toast/toastEl.html";
import defaultIconPath from "@/assets/html/toast/defaultIcon.html";
import successIconPath from "@/assets/html/toast/successIcon.html";
import errorIconPath from "@/assets/html/toast/errorIcon.html";

import type { ToastType } from "@/common/types/toastManager";

interface ToastHTMLElement extends HTMLElement {
  _timeoutId?: number;
  close: () => void;
}

class ToastManager {
  private toastContentTpl: string = "";
  private toastTpl: string = "";
  private icons: Record<string, string> = {
    default: "",
    success: "",
    error: "",
    none: "",
  };
  private isReady: boolean = false;
  private container: HTMLElement | null = null;

  /**
   * 异步初始化：加载资源
   */
  public async setup(): Promise<void> {
    const basePath = "renderer";

    // 并行加载所有资源，提高效率
    const [contentTpl, toastTpl, defIcon, succIcon, errIcon] = await Promise.all([
      importTextAsset(basePath, taostContentPath),
      importTextAsset(basePath, toastPath),
      importTextAsset(basePath, defaultIconPath),
      importTextAsset(basePath, successIconPath),
      importTextAsset(basePath, errorIconPath),
    ]);

    this.toastContentTpl = contentTpl;
    this.toastTpl = toastTpl;
    this.icons.default = defIcon;
    this.icons.success = succIcon;
    this.icons.error = errIcon;

    this.bindGlobalEvents();

    this.isReady = true;
  }

  /**
   * 获取或创建容器
   */
  private getOrCreateContainer(): HTMLElement {
    if (this.container && document.body.contains(this.container)) {
      return this.container;
    }

    let container = document.querySelector<HTMLElement>(".lt-toast");
    if (!container) {
      if (!this.toastContentTpl) {
        throw new Error("Toast templates not loaded. Please await toastManager.setup() first.");
      }
      document.body.insertAdjacentHTML("beforeend", this.toastContentTpl);
      container = document.querySelector<HTMLElement>(".lt-toast");
    }

    if (!container) throw new Error("Failed to initialize toast container");

    this.container = container;
    return container;
  }

  /**
   * 获取图标 HTML
   */
  private getIcon(type: ToastType): string {
    return this.icons[type] || this.icons.default;
  }

  /**
   * 创建 DOM 元素
   */
  private createToastEl(content: string, type: ToastType): ToastHTMLElement {
    const iconHtml = this.getIcon(type);

    // 简单的字符串替换
    const htmlString = this.toastTpl.replace("{{content}}", content).replace("{{icon}}", iconHtml);

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString.trim();

    const element = tempDiv.querySelector<ToastHTMLElement>(".lt-toast-item");
    if (!element) throw new Error("Invalid toast template or structure");

    return element;
  }

  /**
   * 显示提示内容
   * @param content 提示内容
   * @param type 提示类型
   * @param duration 持续时间
   */
  public show(content: string, type: ToastType = "default", duration: number = 3000): ToastHTMLElement | undefined {
    if (!this.isReady) {
      console.warn("ToastManager: setup() has not completed yet. Toast ignored.");
      return;
    }

    const container = this.getOrCreateContainer();
    const toast = this.createToastEl(content, type);

    container.appendChild(toast);

    // 触发重绘
    requestAnimationFrame(() => {
      toast.classList.add("lt-toast-show");
    });

    // 定义关闭逻辑
    toast.close = () => {
      if (toast._timeoutId) {
        window.clearTimeout(toast._timeoutId);
      }

      toast.classList.remove("lt-toast-show");

      toast.addEventListener(
        "transitionend",
        () => {
          if (toast.parentElement) {
            toast.remove();
          }
        },
        { once: true },
      );
    };

    // 自动关闭
    toast._timeoutId = window.setTimeout(() => {
      toast.close();
    }, duration);

    return toast;
  }

  public clear(): void {
    const toasts = document.querySelectorAll<ToastHTMLElement>(".lt-toast-item");
    toasts.forEach((toast) => {
      if (typeof toast.close === "function") {
        toast.close();
      } else {
        toast.remove();
      }
    });
  }

  public bindGlobalEvents() {
    lite_tools.onToast((toast) => {
      this.show(toast.content, toast.type, toast.duration);
    });
    lite_tools.clearToast(() => this.clear());
  }
}

const toastManager = new ToastManager();

export { toastManager };
