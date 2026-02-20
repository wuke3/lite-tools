import { initSettingView } from "@/renderer/pages/settings";
import { main } from "@/renderer/index";
import { LLonVueComponentMount, LLonVueComponentUnmount } from "@/renderer/modules/vueComponentTracker";

main();

export {
  initSettingView as onSettingWindowCreated,
  LLonVueComponentMount as onVueComponentMount,
  LLonVueComponentUnmount as onVueComponentUnmount,
};
