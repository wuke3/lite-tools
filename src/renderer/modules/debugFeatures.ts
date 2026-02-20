import { createLogger } from "@/renderer/utils/createLogger";
import { configStore } from "@/renderer/modules/configStore";
import { waitForInstance } from "@/renderer/utils/domWaitFor";

const log = createLogger("debug");

let viewObserver: MutationObserver | null = null;
let perfMonitorEl: HTMLElement | null = null;
let fpsCanvas: HTMLCanvasElement | null = null;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsHistory: number[] = [];
let animationFrameId: number | null = null;
let isMonitoring = false;
let fpsValueEl: HTMLElement | null = null;
let cpuValueEl: HTMLElement | null = null;
let memoryValueEl: HTMLElement | null = null;
let statsIntervalId: number | null = null;

function initViewUpdates() {
  if (viewObserver) {
    viewObserver.disconnect();
  }
  
  viewObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement && !node.classList.contains("lt-view-updated")) {
            node.classList.add("lt-view-updated");
            setTimeout(() => {
              node.classList.remove("lt-view-updated");
            }, 500);
          }
        }
      }
      if (mutation.target instanceof HTMLElement && !mutation.target.classList.contains("lt-view-updated")) {
        mutation.target.classList.add("lt-view-updated");
        setTimeout(() => {
          (mutation.target as HTMLElement).classList.remove("lt-view-updated");
        }, 500);
      }
    }
  });
  
  viewObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

function stopViewUpdates() {
  if (viewObserver) {
    viewObserver.disconnect();
    viewObserver = null;
  }
}

function createStatItem(label: string, value: string): HTMLElement {
  const item = document.createElement("div");
  item.className = "stat-item";
  
  const labelEl = document.createElement("div");
  labelEl.className = "stat-label";
  labelEl.textContent = label;
  
  const valueEl = document.createElement("div");
  valueEl.className = "stat-value";
  valueEl.textContent = value;
  
  item.appendChild(labelEl);
  item.appendChild(valueEl);
  
  return item;
}

async function fetchSystemStats() {
  try {
    const stats = await (window as any).lite_tools?.getSystemStats?.();
    if (stats) {
      if (cpuValueEl) {
        cpuValueEl.textContent = `${stats.cpu}%`;
        cpuValueEl.style.color = stats.cpu >= 80 ? "#f00" : stats.cpu >= 50 ? "#f90" : "#0f0";
      }
      if (memoryValueEl) {
        memoryValueEl.textContent = `${stats.memory}%`;
        memoryValueEl.style.color = stats.memory >= 80 ? "#f00" : stats.memory >= 50 ? "#f90" : "#0f0";
      }
    }
  } catch (e) {
    log("Failed to get system stats", e);
  }
}

function initPerformanceMonitor() {
  if (perfMonitorEl) {
    return;
  }
  
  perfMonitorEl = document.createElement("div");
  perfMonitorEl.className = "lt-performance-monitor";
  
  const fpsItem = createStatItem("FPS", "60");
  fpsValueEl = fpsItem.querySelector(".stat-value")!;
  
  const cpuItem = createStatItem("CPU", "0%");
  cpuValueEl = cpuItem.querySelector(".stat-value")!;
  
  const memoryItem = createStatItem("MEM", "0%");
  memoryValueEl = memoryItem.querySelector(".stat-value")!;
  
  const graphContainer = document.createElement("div");
  graphContainer.className = "graph-container";
  
  fpsCanvas = document.createElement("canvas");
  fpsCanvas.className = "graph-canvas";
  fpsCanvas.width = 100;
  fpsCanvas.height = 24;
  
  graphContainer.appendChild(fpsCanvas);
  
  perfMonitorEl.appendChild(fpsItem);
  perfMonitorEl.appendChild(cpuItem);
  perfMonitorEl.appendChild(memoryItem);
  perfMonitorEl.appendChild(graphContainer);
  
  lastFrameTime = performance.now();
  frameCount = 0;
  fpsHistory = [];
  isMonitoring = true;
  
  function attachMonitor() {
    const signatureEl = document.querySelector(".profile_longnick");
    if (signatureEl) {
      if (signatureEl) {
        signatureEl.insertAdjacentElement("afterend", perfMonitorEl!);
      }
    } else {
      if (perfMonitorEl) {
        document.body.appendChild(perfMonitorEl);
      }
    }
  }
  
  attachMonitor();
  
  const domObserver = new MutationObserver(() => {
    if (perfMonitorEl && !perfMonitorEl.parentNode) {
      attachMonitor();
    }
  });
  
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  fetchSystemStats();
  statsIntervalId = window.setInterval(fetchSystemStats, 500);
  
  function measurePerformance() {
    if (!isMonitoring) return;
    
    const now = performance.now();
    frameCount++;
    
    if (now - lastFrameTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
      if (fpsValueEl) {
        fpsValueEl.textContent = String(fps);
        fpsValueEl.style.color = fps >= 50 ? "#0f0" : fps >= 30 ? "#f90" : "#f00";
      }
      
      fpsHistory.push(fps);
      if (fpsHistory.length > 50) {
        fpsHistory.shift();
      }
      
      drawFPSGraph();
      
      frameCount = 0;
      lastFrameTime = now;
    }
    
    animationFrameId = requestAnimationFrame(measurePerformance);
  }
  
  measurePerformance();
}

function drawFPSGraph() {
  if (!fpsCanvas) return;
  
  const ctx = fpsCanvas.getContext("2d");
  if (!ctx) return;
  
  const width = fpsCanvas.width;
  const height = fpsCanvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  if (fpsHistory.length < 2) return;
  
  const maxFPS = Math.max(...fpsHistory, 60);
  const minFPS = Math.min(...fpsHistory, 0);
  const range = maxFPS - minFPS || 1;
  
  ctx.beginPath();
  ctx.strokeStyle = "#0f0";
  ctx.lineWidth = 1.5;
  
  for (let i = 0; i < fpsHistory.length; i++) {
    const x = (i / (fpsHistory.length - 1)) * (width - 2);
    const y = height - 2 - ((fpsHistory[i] - minFPS) / range) * (height - 4);
    
    if (i === 0) {
      ctx.moveTo(x + 1, y);
    } else {
      ctx.lineTo(x + 1, y);
    }
  }
  
  ctx.stroke();
}

function stopPerformanceMonitor() {
  isMonitoring = false;
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  if (statsIntervalId) {
    clearInterval(statsIntervalId);
    statsIntervalId = null;
  }
  
  if (perfMonitorEl && perfMonitorEl.parentNode) {
    perfMonitorEl.parentNode.removeChild(perfMonitorEl);
    perfMonitorEl = null;
  }
  
  fpsCanvas = null;
  fpsValueEl = null;
  cpuValueEl = null;
  memoryValueEl = null;
}

function updateDebugConfig(config: Config) {
  if (!config.debug.enabled) {
    document.body.classList.remove("lt-show-view-updates");
    stopViewUpdates();
    stopPerformanceMonitor();
    return;
  }
  
  document.body.classList.toggle("lt-show-view-updates", config.debug.showViewUpdates);
  
  if (config.debug.showViewUpdates) {
    initViewUpdates();
  } else {
    stopViewUpdates();
  }
  
  if (config.debug.performanceMonitor) {
    initPerformanceMonitor();
  } else {
    stopPerformanceMonitor();
  }
}

function initDebugFeatures() {
  configStore.onChange((config) => {
    updateDebugConfig(config);
  });
  
  updateDebugConfig(configStore.value);
}

export { initDebugFeatures };
