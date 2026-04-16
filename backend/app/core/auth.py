"""
認証・認可。

- local環境: モックユーザーを返す（開発容易性）
- dev/prod環境: Cognito の JWT を検証する

研修メモ: JWT の検証は以下のステップ
1. Authorization ヘッダから Bearer トークンを抽出
2. Cognito の JWKs エンドポイントから公開鍵を取得（キャッシュ）
3. 署名・aud・iss・exp を検証
4. sub (= user_id) をリクエストコンテキストに注入
"""
from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from app.config import settings


@dataclass(frozen=True)
class CurrentUser:
    """認証済みユーザー情報。"""

    user_id: str
    email: str


# --- JWKs キャッシュ（プロセスライフタイム）---
_jwks_cache: dict[str, object] | None = None


async def _get_jwks() -> dict[str, object]:
    """Cognitoの公開鍵セットを取得。"""
    global _jwks_cache
    if _jwks_cache is None:
        url = (
            f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/"
            f"{settings.cognito_user_pool_id}/.well-known/jwks.json"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


async def _verify_cognito_token(token: str) -> CurrentUser:
    """Cognito の JWT を検証。"""
    try:
        jwks = await _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = next(
            (k for k in jwks["keys"] if k["kid"] == unverified_header["kid"]),  # type: ignore[index]
            None,
        )
        if rsa_key is None:
            raise HTTPException(status_code=401, detail="Invalid token: key not found")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.cognito_client_id,
            issuer=(
                f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/"
                f"{settings.cognito_user_pool_id}"
            ),
        )
        return CurrentUser(
            user_id=payload["sub"],
            email=payload.get("email", ""),
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}") from e


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> CurrentUser:
    """
    現在のユーザーを取得する FastAPI 依存関数。

    各APIエンドポイントで Depends(get_current_user) するだけで
    認証必須になる。
    """
    # ローカル開発モード: 認証スキップ
    if settings.auth_mock_enabled:
        return CurrentUser(
            user_id=settings.auth_mock_user_id,
            email=settings.auth_mock_email,
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid",
        )

    token = authorization.removeprefix("Bearer ").strip()
    return await _verify_cognito_token(token)


CurrentUserDep = Depends(get_current_user)
