// 类型定义
type ToastType = "success" | "error" | "default" | "none";
type Toast = { type: ToastType; content: string; duration: number };

export type { ToastType, Toast };
