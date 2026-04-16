"""
DB接続とセッション管理。

SQLAlchemy 2.0 の async エンジンを使用。
"""
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """全モデルの基底クラス。"""


# エンジンは globalに1つ
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


async def init_db() -> None:
    """起動時にエンジンを初期化。"""
    global _engine, _session_factory
    _engine = create_async_engine(
        settings.database_url,
        echo=(settings.env == "local"),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    _session_factory = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def close_db() -> None:
    """終了時にエンジンを破棄。"""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI Depends で使うセッションプロバイダ。"""
    if _session_factory is None:
        raise RuntimeError("Database is not initialized")
    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
