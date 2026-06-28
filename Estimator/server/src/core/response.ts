import type { ApiResponse } from '../types/constant_type';

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null };
}

export function err(e: unknown): ApiResponse<never> {
  const message = e instanceof Error ? e.message : String(e);
  return { success: false, data: null, error: message };
}
