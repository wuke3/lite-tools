declare global {
  // LiteLoader 兼容
  const LiteLoader: any;

  // 开发环境
  const __DEV__: boolean;

  // 插件版本
  const __VERSION__: string;

  // QQNT 支持版本
  const __QQNT_VERSION__: string;

  // 构建版本
  const __BUILD_DATE__: string;
}

export {};
