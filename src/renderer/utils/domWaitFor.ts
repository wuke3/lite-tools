type Waiter = {
  selector?: string | null;
  element?: HTMLElement | null;
  resolve: (result: any) => void;
  reject?: (err: Error) => void;
  timeoutId?: number;
  propPath?: string; // 可选，等待实例属性
};

const waiters: Waiter[] = [];
let observer: MutationObserver | null = null;

function getByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const segments = path
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  return segments.reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function ensureObserver() {
  if (!observer) {
    observer = new MutationObserver(() => {
      for (let i = waiters.length - 1; i >= 0; i--) {
        const waiter = waiters[i];
        const element = waiter.element || document.querySelector<HTMLElement>(waiter.selector!);

        if (element) {
          if (waiter.propPath) {
            const vueInstances = element.__VUE__;
            if (vueInstances?.length) {
              for (const instance of new Set(vueInstances)) {
                const value = getByPath(instance, waiter.propPath);
                if (value !== undefined) {
                  waiters.splice(i, 1);
                  if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
                  waiter.resolve({ element, instance, value });
                  break;
                }
              }
            }
          } else {
            // 仅等待元素出现
            waiters.splice(i, 1);
            if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
            waiter.resolve(element);
          }
        }
      }

      if (waiters.length === 0 && observer) {
        observer.disconnect();
        observer = null;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

/**
 * 等待元素出现
 */
function waitForElement(selector: string, timeout?: number): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return resolve(el);

    const waiter: Waiter = { selector, resolve, reject };
    if (timeout !== undefined) {
      waiter.timeoutId = window.setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index !== -1) waiters.splice(index, 1);
        reject?.(new Error(`waitForElement timeout: ${selector}`));
        if (waiters.length === 0 && observer) {
          observer.disconnect();
          observer = null;
        }
      }, timeout);
    }

    waiters.push(waiter);
    ensureObserver();
  });
}

/**
 * 等待 Vue 实例指定属性出现
 */
function waitForInstance(
  elOrSelector: string | HTMLElement,
  propPath: string,
  timeout?: number
): Promise<{ element: HTMLElement; instance: any; value: any }> {
  return new Promise((resolve, reject) => {
    const element =
      typeof elOrSelector === "string" ? document.querySelector<HTMLElement>(elOrSelector)! : elOrSelector;
    if (element) {
      const vueInstances = element.__VUE__;
      if (vueInstances?.length) {
        for (const instance of new Set(vueInstances)) {
          const value = getByPath(instance, propPath);
          if (value !== undefined) return resolve({ element, instance, value });
        }
      }
    }
    const selector = typeof elOrSelector === "string" ? elOrSelector : null;
    const waiter: Waiter = {
      element,
      selector,
      propPath,
      resolve,
      reject,
    };
    if (timeout !== undefined) {
      waiter.timeoutId = window.setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index !== -1) waiters.splice(index, 1);
        reject?.(new Error(`waitForInstance timeout: ${propPath}`));
        if (waiters.length === 0 && observer) {
          observer.disconnect();
          observer = null;
        }
      }, timeout);
    }

    waiters.push(waiter);
    ensureObserver();
  });
}

export { waitForElement, waitForInstance };
