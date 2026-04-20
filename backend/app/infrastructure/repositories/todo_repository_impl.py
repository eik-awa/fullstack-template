"""
TodoRepository の SQLAlchemy 実装。

ドメインエンティティ ←→ ORMモデル の変換はここで行う。
他の層は ORM モデルの存在を知らない。
"""

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.todo import Todo
from app.domain.repositories.todo_repository import TodoRepository
from app.infrastructure.models.todo import TodoORM


class TodoRepositoryImpl(TodoRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, todo: Todo) -> None:
        self._session.add(self._to_orm(todo))
        await self._session.flush()

    async def get_by_id(self, todo_id: UUID, user_id: str) -> Todo | None:
        stmt = select(TodoORM).where(
            TodoORM.id == str(todo_id),
            TodoORM.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        orm = result.scalar_one_or_none()
        return self._to_entity(orm) if orm else None

    async def list_by_user(self, user_id: str) -> list[Todo]:
        stmt = select(TodoORM).where(TodoORM.user_id == user_id).order_by(TodoORM.created_at.desc())
        result = await self._session.execute(stmt)
        return [self._to_entity(orm) for orm in result.scalars().all()]

    async def update(self, todo: Todo) -> None:
        orm = await self._session.get(TodoORM, str(todo.id))
        if orm is None or orm.user_id != todo.user_id:
            return
        orm.title = todo.title
        orm.description = todo.description
        orm.status = todo.status
        orm.due_date = todo.due_date
        orm.updated_at = todo.updated_at
        await self._session.flush()

    async def delete(self, todo_id: UUID, user_id: str) -> bool:
        stmt = delete(TodoORM).where(
            TodoORM.id == str(todo_id),
            TodoORM.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        return result.rowcount > 0  # type: ignore[attr-defined,no-any-return]

    # ---------- 変換 ----------
    @staticmethod
    def _to_orm(todo: Todo) -> TodoORM:
        return TodoORM(
            id=str(todo.id),
            user_id=todo.user_id,
            title=todo.title,
            description=todo.description,
            status=todo.status,
            due_date=todo.due_date,
            created_at=todo.created_at,
            updated_at=todo.updated_at,
        )

    @staticmethod
    def _to_entity(orm: TodoORM) -> Todo:
        return Todo(
            id=orm.id,
            user_id=orm.user_id,
            title=orm.title,
            description=orm.description,
            status=orm.status,
            due_date=orm.due_date,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )
