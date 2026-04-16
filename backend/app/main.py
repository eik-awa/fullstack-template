"""
FastAPI アプリケーションのエントリポイント。

このモジュールは以下の責務のみを持つ:
- FastAPI インスタンスの生成
- ミドルウェアの登録
- ルーターの登録
- ライフサイクルイベント

ビジネスロジックは一切書かない。
"""
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, todos
from app.config import settings
from app.core.logging import configure_logging, get_logger
from app.infrastructure.database import close_db, init_db

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """アプリケーションの起動・終了時の処理。"""
    configure_logging()
    logger.info("application_starting", env=settings.env)
    await init_db()
    yield
    logger.info("application_stopping")
    await close_db()


app = FastAPI(
    title="Training ToDo API",
    description="新卒研修用のToDoアプリケーションAPI",
    version="0.1.0",
    lifespan=lifespan,
    # 本番では /docs を隠す運用もあるが、研修では学習のため常時公開
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# CORS: フロントエンドのオリジンのみ許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ルーター登録
app.include_router(health.router)
app.include_router(todos.router, prefix="/api/v1")
