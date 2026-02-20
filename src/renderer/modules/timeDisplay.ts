import { createLogger } from "@/renderer/utils/createLogger";
import { configStore } from "@/renderer/modules/configStore";

const log = createLogger("timeDisplay");

let timeEl: HTMLElement | null = null;
let timeIntervalId: number | null = null;
let domObserver: MutationObserver | null = null;
let retryTimeoutId: number | null = null;

function formatTime(): string {
  const now = new Date();
  
  const timeZoneOffset = -now.getTimezoneOffset();
  const hoursOffset = Math.floor(Math.abs(timeZoneOffset) / 60);
  const minutesOffset = Math.abs(timeZoneOffset) % 60;
  const timeZone = `GMT${timeZoneOffset >= 0 ? "+" : "-"}${hoursOffset}${minutesOffset > 0 ? ":" + String(minutesOffset).padStart(2, "0") : ""}`;
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  
  return `${timeZone} ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function updateTime() {
  if (timeEl) {
    timeEl.textContent = formatTime();
  }
}

function createTimeElement(): HTMLElement {
  const el = document.createElement("div");
  el.className = "lt-time-display";
  el.style.fontFamily = "monospace";
  el.style.fontSize = "16px";
  el.style.color = "#fff";
  el.style.marginLeft = "0";
  el.style.marginRight = "10px";
  el.style.whiteSpace = "nowrap";
  el.style.userSelect = "none";
  el.style.display = "inline-flex";
  el.style.alignItems = "center";
  el.style.verticalAlign = "middle";
  return el;
}

function findWeatherElement(): HTMLElement | null {
  const widgetsContainer = document.querySelector(".user-profile-card__widgets");
  if (widgetsContainer) {
    const weatherWidget = widgetsContainer.querySelector(".weather-widget");
    if (weatherWidget) {
      return weatherWidget as HTMLElement;
    }
  }
  return document.querySelector(".weather-widget") as HTMLElement | null;
}

function insertTime() {
  if (!timeEl) return;
  
  const weatherEl = findWeatherElement();
  if (weatherEl) {
    const widgetsContainer = document.querySelector(".user-profile-card__widgets");
    if (widgetsContainer) {
      (widgetsContainer as HTMLElement).style.display = "flex";
      (widgetsContainer as HTMLElement).style.alignItems = "center";
      (widgetsContainer as HTMLElement).style.flexDirection = "row";
    }
    
    if (!timeEl.parentNode || timeEl.parentNode !== weatherEl.parentNode || timeEl.nextElementSibling !== weatherEl) {
      if (timeEl.parentNode) {
        timeEl.parentNode.removeChild(timeEl);
      }
      weatherEl.insertAdjacentElement("beforebegin", timeEl);
    }
  }
}

function initTimeDisplay() {
  if (timeEl) {
    return;
  }
  
  timeEl = createTimeElement();
  updateTime();
  
  let retryCount = 0;
  const maxRetries = 100;
  
  function tryInsert() {
    insertTime();
    if (timeEl && timeEl.parentNode) {
      return;
    }
    retryCount++;
    if (retryCount < maxRetries) {
      retryTimeoutId = window.setTimeout(tryInsert, 100);
    }
  }
  
  tryInsert();
  
  timeIntervalId = window.setInterval(updateTime, 1000);
  
  domObserver = new MutationObserver(() => {
    if (timeEl && !timeEl.parentNode) {
      insertTime();
    }
  });
  
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function stopTimeDisplay() {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  
  if (timeIntervalId) {
    clearInterval(timeIntervalId);
    timeIntervalId = null;
  }
  
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }
  
  if (timeEl && timeEl.parentNode) {
    timeEl.parentNode.removeChild(timeEl);
    timeEl = null;
  }
}

function updateTimeConfig(config: Config) {
  if (config.interface.showTime) {
    initTimeDisplay();
  } else {
    stopTimeDisplay();
  }
}

function initTimeFeatures() {
  configStore.onChange((config) => {
    updateTimeConfig(config);
  });
  
  updateTimeConfig(configStore.value);
}

export { initTimeFeatures };
