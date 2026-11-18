// 游戏详情页「系统需求」的可选项与默认值。
// 后台与用户投稿端共用，详情页留空时回退到软件同款默认值。

export const OS_OPTIONS = [
  "Windows XP",
  "Windows 7",
  "Windows 8 / 8.1",
  "Windows 10",
  "Windows 11",
  "Windows 7 / 8 / 10 / 11（64 位）",
] as const;

export const GPU_OPTIONS = [
  "NVIDIA GeForce 系列",
  "AMD Radeon 系列",
  "Intel 核显（HD / UHD / Iris）",
  "支持 DirectX 9.0c 的集成显卡",
] as const;

export const RUNTIME_OPTIONS = [
  "RMXP RTP",
  "RMVX RTP",
  "RMVA RTP",
  "RPG Maker MV",
  "RPG Maker MZ",
] as const;

export const DEFAULT_REQUIREMENTS = {
  os: "Windows 7 / 8 / 10 / 11（64 位）",
  cpu: "Intel Core i3-2100 或 AMD 同级及以上",
  memory: "4 GB RAM",
  gpu: "支持 DirectX 9.0c 的集成显卡",
  runtime: "RPG Maker RTP",
} as const;
