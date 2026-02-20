import { isqwq, isll } from "@/renderer/utils/loaderInspector";
import { join } from "@/renderer/utils/pathUtils";
import packageJson from "package.json";

let configPath: string;
let dataPath: string;
let pluginPath: string;
if (isll) {
  configPath = join(LiteLoader.plugins[packageJson.name].path.data, "configs");
  dataPath = join(LiteLoader.plugins[packageJson.name].path.data, "data");
  pluginPath = join(LiteLoader.plugins[packageJson.name].path.plugin);
} else if (isqwq) {
  configPath = join(qwqnt.framework.paths.configs, packageJson.name);
  dataPath = join(qwqnt.framework.paths.data, packageJson.name);
  pluginPath = join(qwqnt.framework.plugins[packageJson.name].meta.path);
}

export { configPath, dataPath, pluginPath };
