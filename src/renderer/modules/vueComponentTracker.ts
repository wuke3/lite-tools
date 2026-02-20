import { safeCall } from "@/renderer/utils/safeCall";

const mountedCallbacks = new Set<ListenerCallback>();
const unmountedCallbacks = new Set<ListenerCallback>();

type ListenerCallback = (component: any) => void;

function onComponentMount(fn: ListenerCallback) {
  if (!mountedCallbacks.has(fn)) {
    mountedCallbacks.add(fn);
  }
  return () => offComponentMount(fn);
}
function onComponentUnmount(fn: ListenerCallback) {
  if (!unmountedCallbacks.has(fn)) {
    unmountedCallbacks.add(fn);
  }
  return () => offComponentUnmount(fn);
}

function offComponentMount(fn: ListenerCallback) {
  mountedCallbacks.delete(fn);
}

function offComponentUnmount(fn: ListenerCallback) {
  unmountedCallbacks.delete(fn);
}

function qwqSetupVueComponentTracker() {
  window.addEventListener("vue:component-mount", (e) => {
    const event = e as CustomEvent;
    const component = event.detail;
    for (const fn of mountedCallbacks) {
      safeCall(fn, "mountedCallbacks", component);
    }
  });
  window.addEventListener("vue:component-unmount", (e) => {
    const event = e as CustomEvent;
    const component = event.detail;
    for (const fn of unmountedCallbacks) {
      safeCall(fn, "unmountedCallbacks", component);
    }
  });
}

function LLonVueComponentMount(component: any) {
  for (const fn of mountedCallbacks) {
    safeCall(fn, "mountedCallbacks", component);
  }
}

function LLonVueComponentUnmount(component: any) {
  for (const fn of unmountedCallbacks) {
    safeCall(fn, "unmountedCallbacks", component);
  }
}

export {
  onComponentMount,
  onComponentUnmount,
  offComponentMount,
  offComponentUnmount,
  LLonVueComponentMount,
  LLonVueComponentUnmount,
  qwqSetupVueComponentTracker,
};
