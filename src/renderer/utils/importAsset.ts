import { resolvePath, join } from "@/renderer/utils/pathUtils";
import { pluginPath } from "@/renderer/utils/pluginPaths";
async function importHtmlAsset(path: string, fileName: string) {
  const text = await importTextAsset(path, fileName);
  const template = document.createElement("template");
  template.innerHTML = text.trim();
  return template.content.firstElementChild as HTMLElement | null;
}

async function importTextAsset(path: string, fileName: string) {
  return await (await fetch(resolvePath(join(pluginPath, "dist", path, fileName)))).text();
}

export { importHtmlAsset, importTextAsset };
