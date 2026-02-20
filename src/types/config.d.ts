// src/types/config.d.ts
import configJson from "@/config/main.template.json";

type BaseConfig = typeof configJson;

type FuncBar = {
  name: string;
  id: string;
  enabled?: boolean;
};

type ObjectFit = "cover" | "contain" | "fill";
type CoverArea = "chat" | "full";

type Wallpaper = {
  enabled: boolean;
  imagePath: string;
  objectFit: ObjectFit;
  coverArea: CoverArea;
  opacity: `${number}`;
};

type ExtendedConfig = Omit<BaseConfig, "chatFuncBar" | "topFuncBar"> & {
  topFuncBar: FuncBar[];
  chatFuncBar: FuncBar[];
  interface: Omit<BaseConfig["interface"], "wallpaper"> & {
    wallpaper: Wallpaper;
  };
};

declare global {
  type Config = ExtendedConfig;
  type FuncBar = FuncBar;
  type BaseConfig = BaseConfig;
}

export {};
