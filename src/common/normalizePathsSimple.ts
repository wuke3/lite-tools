function normalizePathsSimple(paths: string[]): string[] {
  return paths.map((p) => p.replaceAll("\\", "/"));
}

export { normalizePathsSimple };
