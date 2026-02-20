import os from "os";
import { createLogger } from "@/main/utils/createLogger";

const log = createLogger("systemMonitor");

let lastCpuTimes: { idle: number; total: number } | null = null;

function getCpuUsage(): number {
  const cpus = os.cpus();
  if (!cpus || cpus.length === 0) {
    return 0;
  }
  
  let idle = 0;
  let total = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += (cpu.times as any)[type];
    }
    idle += cpu.times.idle;
  }
  
  if (lastCpuTimes) {
    const idleDiff = idle - lastCpuTimes.idle;
    const totalDiff = total - lastCpuTimes.total;
    
    if (totalDiff > 0) {
      const percentage = Math.round(100 - (idleDiff / totalDiff) * 100);
      lastCpuTimes = { idle, total };
      return Math.max(0, Math.min(100, percentage));
    }
  }
  
  lastCpuTimes = { idle, total };
  return 0;
}

function getMemoryUsage(): number {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return Math.round((usedMem / totalMem) * 100);
}

function getSystemStats(): { cpu: number; memory: number } {
  return {
    cpu: getCpuUsage(),
    memory: getMemoryUsage(),
  };
}

export { getSystemStats };
