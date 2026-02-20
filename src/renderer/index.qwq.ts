import packageJson from "package.json";
import { initSettingView } from "@/renderer/pages/settings";
import { main } from "@/renderer/index";
import { qwqSetupVueComponentTracker } from "@/renderer/modules/vueComponentTracker";

qwqSetupVueComponentTracker();
main();

RendererEvents.onSettingsWindowCreated(async () => {
  const view = await PluginSettings.renderer.registerPluginSettings(packageJson);
  initSettingView(view);
});
