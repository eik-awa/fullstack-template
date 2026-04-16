/**
 * APIクライアント（axios ラッパー）。
 *
 * - 認証トークンの自動付与
 * - エラーの型付け
 * - ベースURL の一元管理
 */
import axios, { AxiosError, type AxiosInstance } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`API Error ${status}: ${detail}`);
  }
}

let accessTokenProvider: (() => string | null) | null = null;

/**
 * 認証トークンの提供関数を登録する。
 * App.tsx の初期化時に useAuth().user?.access_token を返す関数を渡す想定。
 */
export function setAccessTokenProvider(provider: () => string | null): void {
  accessTokenProvider = provider;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  const token = accessTokenProvider?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status ?? 0;
    const detail = error.response?.data?.detail ?? error.message;
    return Promise.reject(new ApiError(status, detail));
  },
);
