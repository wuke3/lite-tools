import path from "node:path";
import packageJson from "package.json";

let configPath: string;
let dataPath: string;
let pluginPath: string;
if ("LiteLoader" in globalThis) {
  configPath = path.join(LiteLoader.plugins[packageJson.name].path.data, "configs");
  dataPath = path.join(LiteLoader.plugins[packageJson.name].path.data, "data");
  pluginPath = path.join(LiteLoader.plugins[packageJson.name].path.plugin);
} else if ("qwqnt" in globalThis) {
  configPath = path.join(qwqnt.framework.paths.configs, packageJson.name);
  dataPath = path.join(qwqnt.framework.paths.data, packageJson.name);
  pluginPath = path.join(qwqnt.framework.plugins[packageJson.name].meta.path);
}

export { configPath, dataPath, pluginPath };
