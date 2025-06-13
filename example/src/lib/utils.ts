import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 请求处理
export function parseQueryParam(param: string | string[] | undefined): string | undefined {
  return Array.isArray(param) ? param[0] : param
}
