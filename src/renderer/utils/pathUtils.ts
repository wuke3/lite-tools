import { isqwq, isll } from "@/renderer/utils/loaderInspector";

function join(...parts: string[]) {
  const normalizedParts = parts.filter((p) => typeof p === "string" && p !== "").map((p) => p.replace(/\\/g, "/"));

  if (normalizedParts.length === 0) return ".";

  const joinedPath = normalizedParts.join("/");
  const segments = joinedPath.split("/");

  const stack = [];
  const isAbsolute = joinedPath.startsWith("/") || /^[a-zA-Z]:\//.test(joinedPath);

  for (const segment of segments) {
    if (segment === "..") {
      if (stack.length > 0 && stack[stack.length - 1] !== "..") {
        stack.pop();
      } else if (!isAbsolute) {
        stack.push("..");
      }
    } else if (segment !== "." && segment !== "") {
      stack.push(segment);
    }
  }

  let result = stack.join("/");

  // 处理前缀：如果是绝对路径，补回开头的 /
  if (isAbsolute && !result.startsWith("/")) {
    if (!/^[a-zA-Z]:/.test(result)) {
      result = "/" + result;
    }
  }

  return result || (isAbsolute ? "/" : ".");
}

function resolvePath(filePath: string) {
  if (isll) {
    return `local:///${filePath}`;
  } else if (isqwq) {
    return qwqnt.framework.protocol.pathToStorageUrl(filePath);
  }
  return filePath;
}

export { join, resolvePath };
