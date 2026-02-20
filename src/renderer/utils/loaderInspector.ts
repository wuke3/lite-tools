import packageJson from "package.json";

const isqwq = "qwqnt" in window && qwqnt.framework?.plugins?.[packageJson.name];
const isll = "LiteLoader" in window && LiteLoader.plugins?.[packageJson.name];

export { isqwq, isll };
