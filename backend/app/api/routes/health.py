"""ヘルスチェック。ALB/ECSのヘルスチェック用。"""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    """アプリケーションの生存確認。"""
    return {"status": "ok"}
