import { createLogger } from "@/renderer/utils/createLogger";

const log = createLogger("safeCall");

export function safeCall<T extends (...args: any[]) => any>(fn: T, name: string, ...args: any[]) {
  try {
    fn(...args);
  } catch (err) {
    log(name, err);
  }
}
