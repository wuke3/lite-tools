import settingsHTMLPath from "@/assets/html/settings/index.html";
import { createLogger } from "@/renderer/utils/createLogger";
import { configStore } from "@/renderer/modules/configStore";
import { isll } from "@/renderer/utils/loaderInspector";
import { normalizePathsSimple } from "@/common/normalizePathsSimple";
import { styleManager } from "@/renderer/modules/styleManager";
import { pluginPath } from "@/renderer/utils/pluginPaths";
import { join, resolvePath } from "@/renderer/utils/pathUtils";
import { toastManager } from "@/renderer/modules/toastManager";

type OptionItem = {
  name: string;
  [key: string]: any;
};

const log = createLogger("settings");

const quotes = [
  "愿作雪中炭，不为锦上花。",
  "稀缺因惜而贵，传递因善而久。",
  "此物微光，只为照亮急需之路。",
  "一念守护，成全急需；一份珍惜，延续善意。",
  "惜此稀缺，留予所需；善心流转，温暖长存。",
  "真正的拥有，是懂得为他人留一盏灯。",
  "稀缺非独占，善意自流转。",
  "你今日的珍惜，是他人明日的希望。",
  "仅供内部测试，请勿外传，违者必究。"
];

async function initSettingView(view: HTMLDivElement) {
  styleManager.inject("settings");
  styleManager.inject("GitHubMarkdownMini");
  await configStore.ready;
  await toastManager.setup();
  const config = configStore.value;
  log("获取到配置数据", config);
  try {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const devInfo: HTMLDivElement = document.createElement("div");
    devInfo.className = "wrap";
    devInfo.innerHTML = `
  <div class="vertical-list-item">
  <p>插件版本：${__VERSION__}</p>
  <p>QQNT支持：${__QQNT_VERSION__}</p>
  <p>构建时间：${__BUILD_DATE__}</p>
  </div>
  `;
    devInfo.insertAdjacentHTML(
      "afterbegin",
      `<div style="color: red;justify-content: center;" class="vertical-list-item">
    <p><strong>${randomQuote}</strong></p>
  </div>`,
    );
    const settingsHTML = await (await fetch(resolvePath(join(pluginPath, "dist/renderer", settingsHTMLPath)))).text();
    view.insertAdjacentHTML("beforeend", settingsHTML);
    view.querySelector(".lite-tools-settings")!.insertAdjacentElement("afterbegin", devInfo);
    log("初始化HTML完成");
    initSettings(view, config);
  } catch (err: any) {
    log("初始化出错", err);
    view.insertAdjacentHTML("beforeend", `<div class="error">初始化配置页面出现错误：</div>`);
    view.insertAdjacentHTML("beforeend", `<pre class="error">${err}${err?.stack}</pre>`);
  }
}

async function initSettings(view: HTMLDivElement, config: Config) {
  // 显示插件版本信息
  const versionLink = view.querySelector(".version .link") as HTMLElement;
  versionLink.innerText = __VERSION__;
  
  // 点击版本号7次激活调试模式
  let clickCount = 0;
  let clickTimer: number | null = null;
  versionLink.addEventListener("click", () => {
    clickCount++;
    
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    
    if (clickCount >= 7) {
      if (!config.debug.enabled) {
        config.debug.enabled = true;
        configStore.setConfig(config);
        toastManager.show("调试模式已激活！", "success");
        
        // 如果调试菜单是折叠的，自动展开
        const debugWrap = view.querySelector(".wrap.other");
        if (debugWrap) {
          const icon = debugWrap.querySelector(".icon");
          const ul = debugWrap.querySelector("ul");
          if (icon && ul) {
            icon.classList.remove("is-fold");
            ul.classList.remove("hidden");
          }
        }
      }
      clickCount = 0;
      return;
    }
    
    clickTimer = window.setTimeout(() => {
      clickCount = 0;
    }, 1000);
  });
  
  // 初始化折叠
  initWrap(view, config);
  // 初始化switch按钮
  initSwitchButton(view, config);
  // 初始化下拉菜单
  initSelectMenu(view, config);
  // 初始化精简功能
  initSidebar(view, config);
  // 初始化撤回相关选项
  initRecallOptions(view, config);
  // 初始化输入框
  initInput(view, config);
  // 初始化按钮
  initButton(view, config);
  log("初始化设置页面完成");
}

// 初始化按钮
function initButton(view: HTMLDivElement, config: Config) {
  view.querySelectorAll<HTMLButtonElement>("button").forEach((el) => {
    const configPath = el.dataset.config;
    if (!configPath) return;

    const value = getValueByPath(config, configPath);
    if (value === undefined) {
      el.classList.add("error-button");
      el.setAttribute("placeholder", "配置项不存在");
      return;
    }

    const chooseType = el.dataset.choose;

    // 校验类型，若不符合要求直接跳过，避免嵌套
    if (chooseType && ["file", "files", "folder"].includes(chooseType)) {
      el.addEventListener("click", async () => {
        const fileExt = el.dataset.fileExt?.split(",") ?? ["*"];

        // 1. 根据类型动态生成 properties
        const properties: Electron.OpenDialogOptions["properties"] = ["dontAddToRecent"];

        if (chooseType === "folder") {
          properties.push("openDirectory");
        } else {
          properties.push("openFile");
          if (chooseType === "files") {
            properties.push("multiSelections");
          }
        }

        const filters = chooseType === "folder" ? [] : [{ name: "Files", extensions: fileExt }];

        const result = await lite_tools.showOpenDialog({
          title: chooseType === "folder" ? "选择文件夹" : "选择文件",
          properties: properties,
          filters: filters,
        });

        // 4. 处理结果
        if (!result.canceled && result.filePaths.length > 0) {
          const filePaths = normalizePathsSimple(result.filePaths);
          log("选中的路径:", configPath, filePaths);

          if (chooseType === "file") {
            setValueByPath(config, configPath, filePaths[0]);
            configStore.setConfig(config);
            dispatchEvent(view, configPath, filePaths[0]);
          } else {
            setValueByPath(config, configPath, filePaths);
            configStore.setConfig(config);
            dispatchEvent(view, configPath, filePaths);
          }
        }
      });
    }
  });
}

// 初始化输入框
function initInput(view: HTMLDivElement, config: Config) {
  view.querySelectorAll<HTMLInputElement>("input").forEach((el) => {
    const configPath = el.getAttribute("data-config");
    if (!configPath) return;

    const value = getValueByPath(config, configPath);
    if (value === undefined) {
      el.classList.add("error-input");
      el.value = "";
      el.setAttribute("placeholder", "配置项不存在");
      return;
    }
    el.value = value;
    view.addEventListener(configPath, (e) => {
      const event = e as CustomEvent<string>;
      el.value = event.detail;
    });
    if (el.hasAttribute("readonly")) {
      if (el.hasAttribute("data-clear")) {
        el.addEventListener("click", () => {
          setValueByPath(config, configPath, "");
          configStore.setConfig(config);
          dispatchEvent(view, configPath, "");
        });
      }
    } else {
      el.addEventListener("change", () => {
        setValueByPath(config, configPath, el.value);
        configStore.setConfig(config);
        dispatchEvent(view, configPath, el.value);
      });
    }
  });
}

// 初始化撤回
async function initRecallOptions(view: HTMLDivElement, config: Config) {
  const localRecallMsgCache = view.querySelector<HTMLInputElement>(".local-recall-msg-num")!;
  const recallColor = view.querySelector<HTMLInputElement>(".custom-text-color")!;
  const reeditColor = view.querySelector<HTMLInputElement>(".custom-reedit-color")!;
  const openRedirectPicPathBtn = view.querySelector(".open-redirect-pic-path")!;
  view.querySelector(".clear-localStorage-recall-msg")!.addEventListener("click", () => {
    lite_tools.clearRecallCache();
  });
  view.querySelector(".open-recall-msg-list")?.addEventListener("click", () => {
    lite_tools.openRecallMsgList();
  });
  recallColor.value = config.message.preventRecall.customTextColor;
  reeditColor.value = config.message.preventRecall.reeditTextColor;
  lite_tools.onUpdateRecallCacheSize(
    (size) => (localRecallMsgCache.innerText = `清除所有本地保存的撤回数据，当前保存有 ${size} 条消息`),
  );
  localRecallMsgCache.innerText = `清除所有本地保存的撤回数据，当前保存有 ${await lite_tools.getRecallCacheSize()} 条消息`;
  openRedirectPicPathBtn.addEventListener("click", () => {
    lite_tools.openRedirectPicPath();
  });
  recallColor.addEventListener("change", () => {
    config.message.preventRecall.customTextColor = recallColor.value;
    configStore.setConfig(config);
  });
  reeditColor.addEventListener("change", () => {
    config.message.preventRecall.reeditTextColor = reeditColor.value;
    configStore.setConfig(config);
  });
}

// 初始化精简功能
function initSidebar(view: HTMLDivElement, config: Config) {
  const sidebarEl = view.querySelector(".sideBar ul") as HTMLElement;
  const topFuncBarEl = view.querySelector(".topFuncBar ul") as HTMLElement;
  const chatFuncBarEl = view.querySelector(".chatFuncBar ul") as HTMLElement;
  createOptionItems(config, config.sideBar.top, sidebarEl, "sideBar.top", "enabled");
  createOptionItems(config, config.sideBar.bottom, sidebarEl, "sideBar.bottom", "enabled");
  if (config.topFuncBar.length > 1) {
    topFuncBarEl.querySelector(".first-tips")?.remove();
  }
  createOptionItems(config, config.topFuncBar, topFuncBarEl, "topFuncBar", "enabled");
  if (config.chatFuncBar.length > 1) {
    chatFuncBarEl.querySelector(".first-tips")?.remove();
  }
  createOptionItems(config, config.chatFuncBar, chatFuncBarEl, "chatFuncBar", "enabled");
  configStore.onChange((config) => {
    updateOptionItems(config.sideBar.top, sidebarEl, "sideBar.top", "enabled");
    updateOptionItems(config.sideBar.bottom, sidebarEl, "sideBar.bottom", "enabled");
  });
}

// 派发事件
function dispatchEvent(el: HTMLElement, configPath: string, detail: any) {
  const event = new CustomEvent(configPath, { detail });
  el.dispatchEvent(event);
}

// 初始化折叠
function initWrap(view: HTMLDivElement, config: Config) {
  view.querySelectorAll(".wrap .vertical-list-item.title").forEach((el) => {
    el.addEventListener("click", () => {
      const wrap = el.parentElement!;
      
      // 如果是调试菜单，检查是否已激活
      if (wrap.classList.contains("other")) {
        if (!config.debug.enabled) {
          return;
        }
      }
      
      wrap.querySelector(".icon")!.classList.toggle("is-fold");
      wrap.querySelector("ul")!.classList.toggle("hidden");
    });
  });
}

// 初始化switch按钮
function initSwitchButton(view: HTMLDivElement, config: Config) {
  view.querySelectorAll(".q-switch").forEach((el) => {
    const configPath = el.getAttribute("data-config");
    if (!configPath) return;

    const configValue = getValueByPath(config, configPath);
    if (configValue === undefined) {
      el.classList.add("error-switch");
      el.setAttribute("title", "配置项不存在");
      return;
    }
    el.classList.toggle("is-active", configValue);
    // 初始化时触发一次事件
    dispatchEvent(view, configPath, configValue);
    // 添加事件
    el.addEventListener("click", function () {
      const newValue = el.classList.toggle("is-active");
      log("更新配置项", configPath, newValue);
      
      // 如果是关闭调试模式，重置所有调试选项
      if (configPath === "debug.enabled" && !newValue) {
        config.debug = {
          enabled: false,
          console: false,
          mainConsole: false,
          showAllElements: false,
          showViewUpdates: false,
          performanceMonitor: false,
        };
        configStore.setConfig(config);
        toastManager.show("调试模式已关闭");
        
        // 重新初始化所有switch按钮
        view.querySelectorAll(".q-switch").forEach((switchEl) => {
          const path = switchEl.getAttribute("data-config");
          if (!path) return;
          const value = getValueByPath(config, path);
          switchEl.classList.toggle("is-active", value);
        });
        
        // 折叠调试菜单
        const debugWrap = view.querySelector(".wrap.other");
        if (debugWrap) {
          const icon = debugWrap.querySelector(".icon");
          const ul = debugWrap.querySelector("ul");
          if (icon && ul) {
            icon.classList.add("is-fold");
            ul.classList.add("hidden");
          }
        }
        
        return;
      }
      
      setValueByPath(config, configPath, newValue);
      configStore.setConfig(config);
      dispatchEvent(view, configPath, newValue);
      // 彩蛋触发函数
      // switchButtons();
    });
  });
}

// 初始化下拉菜单
function initSelectMenu(view: HTMLDivElement, config: Config) {
  // 全局点击事件，关闭下拉菜单
  view.addEventListener("click", function (event) {
    const target = event.target as HTMLElement;
    if (!target.closest(".setting-select")) {
      view.querySelectorAll(".setting-option")!.forEach((item) => {
        item.classList.remove("show");
      });
    }
  });
  view.querySelectorAll(".setting-select").forEach((el) => {
    const item = el as HTMLElement;
    const configPath = item.getAttribute("data-config");
    if (!configPath) return;

    // 初始化选项
    const configValue = getValueByPath(config, configPath);
    if (configValue === undefined) {
      el.classList.add("error-switch");
      el.setAttribute("title", "配置项不存在");
      return;
    }
    const findEl = Array.from(item.querySelectorAll(".setting-item")).find(
      (item) => item.getAttribute("data-value") === configValue,
    ) as HTMLElement;
    const showVlaue = findEl?.innerText ?? configValue;
    item.querySelector("input.setting-input")?.setAttribute("value", showVlaue);
    item.querySelector("div.setting-view")?.setAttribute("data-value", showVlaue);
    // 初始化时触发一次事件
    dispatchEvent(view, configPath, configValue);
    // 添加监听
    item.addEventListener("click", function (event) {
      const target = event.target as HTMLElement;
      log("点击下拉菜单", target.classList);
      if (target.classList.contains("setting-item")) {
        const newValue = target.getAttribute("data-value");
        const showVlaue = target.innerText;
        log("更新下拉配置项", item, configPath, newValue);
        setValueByPath(config, configPath, newValue);
        configStore.setConfig(config);
        item.querySelector("input.setting-input")?.setAttribute("value", showVlaue);
        item.querySelector("div.setting-view")?.setAttribute("data-value", showVlaue);
        dispatchEvent(view, configPath, newValue);
      }
      view.querySelectorAll(".setting-select")!.forEach((item) => {
        if (item === el) return;
        item.querySelector(".setting-option")!.classList.remove("show");
      });
      item.querySelector(".setting-option")!.classList.toggle("show");
    });
  });
}

// 创建选项
function createOptionItems<T extends OptionItem>(
  config: Config,
  list: T[],
  element: HTMLElement,
  objKey: string,
  key: keyof T,
) {
  const frag = document.createDocumentFragment();

  list.forEach((item, index) => {
    const hr = document.createElement("hr");
    hr.classList.add("horizontal-dividing-line");

    const li = document.createElement("li");
    li.classList.add("vertical-list-item");
    li.dataset.id = `${objKey}-${item.name}`;

    const div = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = item.name;
    div.append(title);
    if (item.desc) {
      const desc = document.createElement("p");
      desc.classList.add("secondary-text");
      desc.textContent = item.desc;
      div.append(desc);
    }
    li.append(div);

    if (item[key] !== undefined) {
      const switchEl = document.createElement("div");
      switchEl.classList.add("q-switch");
      switchEl.classList.toggle("is-active", item[key]);
      switchEl.dataset.index = index.toString();
      switchEl.addEventListener("click", () => {
        const active = !switchEl.classList.contains("is-active");
        log("更新配置项", objKey, index, key, active);
        setValueByPath(config, `${objKey}[${index}].${String(key)}`, active);
        switchEl.classList.toggle("is-active", active);
        configStore.setConfig(config);
      });
      const span = document.createElement("span");
      span.classList.add("q-switch__handle");
      switchEl.append(span);
      li.append(switchEl);
    }

    frag.append(hr, li);
  });

  element.appendChild(frag);
}

// 更新选项
function updateOptionItems<T extends OptionItem>(list: T[], element: HTMLElement, objKey: string, key: keyof T) {
  list.forEach((item) => {
    const switchEl = element.querySelector(`li[data-id="${objKey}-${item.name}"] .q-switch`) as HTMLElement;
    switchEl.classList.toggle("is-active", item[key]);
  });
}

// 获取配置
function getValueByPath<T = any>(target: Record<string, any>, path: string): T | undefined {
  const pathArr = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let result: any = target;
  for (let i = 0; i < pathArr.length; i++) {
    if (result != null && result[pathArr[i]] !== undefined) {
      result = result[pathArr[i]];
    } else {
      return undefined;
    }
  }
  return result as T;
}

// 设置配置
function setValueByPath(
  target: Record<string, any>,
  path: string,
  value: any,
  createPath: boolean = false,
  overridePath: boolean = false,
): boolean {
  const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: any = target;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if ((!current[key] && createPath) || (!(current[key] instanceof Object) && overridePath)) {
      current[key] = {};
    }
    if (!current[key]) {
      return false;
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return true;
}

export { initSettingView };
