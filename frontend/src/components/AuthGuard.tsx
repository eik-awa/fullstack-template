/**
 * 認証ガード。
 * 未ログインなら Cognito Hosted UI へリダイレクト。
 * ローカル開発 (authMockEnabled=true) ではそのまま通す。
 */
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { authMockEnabled, setAccessTokenProvider } from "@/lib/authConfig";
import { setAccessTokenProvider as setApiToken } from "@/lib/apiClient";

interface Props {
  children: React.ReactNode;
}

export function AuthGuard({ children }: Props) {
  const auth = useAuth();

  useEffect(() => {
    if (authMockEnabled) {
      setApiToken(() => null);
      return;
    }
    setApiToken(() => auth.user?.access_token ?? null);
  }, [auth.user]);

  if (authMockEnabled) {
    return <>{children}</>;
  }

  if (auth.isLoading) {
    return <p className="text-center py-8 text-slate-500">認証確認中...</p>;
  }

  if (auth.error) {
    return (
      <div className="text-center py-8 text-red-600">
        認証エラー: {auth.error.message}
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-slate-700">ログインが必要です</p>
        <button
          onClick={() => void auth.signinRedirect()}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        >
          ログイン
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// 未使用 import を避けるための再エクスポート
export { setAccessTokenProvider };
