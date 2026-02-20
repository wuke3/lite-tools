import type { LiteTools } from "@/preload/index";

declare global {
  // preload 暴露方法
  const lite_tools: LiteTools;

  interface Window {
    navigation: any;
    qwqnt: any;
    lt_logs: () => void;
    lt_errors: () => void;
  }

  interface Element {
    __VUE__?: any[];
    __vue_app__?: any;
  }
}

export {};
