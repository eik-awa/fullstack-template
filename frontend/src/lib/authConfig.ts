/**
 * Cognito OIDC 設定。
 *
 * 環境変数:
 *   VITE_COGNITO_DOMAIN       - Cognito Hosted UI のドメイン
 *   VITE_COGNITO_CLIENT_ID    - App Client ID
 *   VITE_AUTH_MOCK            - ローカル開発でモック認証を有効化する場合 "true"
 */
import type { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

const domain = import.meta.env.VITE_COGNITO_DOMAIN ?? "";
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? "";
const redirectUri = `${window.location.origin}/auth/callback`;

export const authMockEnabled =
  import.meta.env.VITE_AUTH_MOCK === "true" || !domain;

export const oidcConfig: AuthProviderProps = {
  authority: domain ? `https://${domain}` : "https://placeholder.invalid",
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope: "openid email profile",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
