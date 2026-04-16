"""
アプリケーション設定。

環境変数から読み込み、pydantic-settings で型安全にアクセス。
本番では Secrets Manager 経由で DB_URL などが注入される。
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """環境変数から読み込まれる設定。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # アプリケーション基本
    env: Literal["local", "dev", "prod"] = "local"
    log_level: str = "INFO"

    # DB
    database_url: str = Field(
        default="mysql+aiomysql://root:rootpass@db:3306/todos",
        description="SQLAlchemy 形式の接続文字列。本番は Secrets Manager から注入",
    )

    # CORS
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173"],
        description="許可するオリジンのリスト",
    )

    # Cognito（本番で使用、ローカルはモック）
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    cognito_region: str = "ap-northeast-1"

    # 認証モック（local環境のみ）
    auth_mock_enabled: bool = True
    auth_mock_user_id: str = "00000000-0000-0000-0000-000000000001"
    auth_mock_email: str = "dev@example.com"


@lru_cache
def _get_settings() -> Settings:
    """シングルトンで設定を取得。"""
    return Settings()


settings = _get_settings()
