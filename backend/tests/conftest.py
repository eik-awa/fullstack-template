"""pytest の共通フィクスチャ。"""
from collections.abc import AsyncIterator
from uuid import UUID

import pytest
import pytest_asyncio

from app.domain.entities.todo import Todo
from app.domain.repositories.todo_repository import TodoRepository


class InMemoryTodoRepository(TodoRepository):
    """テスト用のインメモリリポジトリ。

    DBに依存しないユニットテストが書けるようになる。
    """

    def __init__(self) -> None:
        self._store: dict[UUID, Todo] = {}

    async def add(self, todo: Todo) -> None:
        self._store[todo.id] = todo

    async def get_by_id(self, todo_id: UUID, user_id: str) -> Todo | None:
        todo = self._store.get(todo_id)
        if todo and todo.user_id == user_id:
            return todo
        return None

    async def list_by_user(self, user_id: str) -> list[Todo]:
        return [t for t in self._store.values() if t.user_id == user_id]

    async def update(self, todo: Todo) -> None:
        if todo.id in self._store:
            self._store[todo.id] = todo

    async def delete(self, todo_id: UUID, user_id: str) -> bool:
        todo = self._store.get(todo_id)
        if todo and todo.user_id == user_id:
            del self._store[todo_id]
            return True
        return False


@pytest_asyncio.fixture
async def repo() -> AsyncIterator[InMemoryTodoRepository]:
    yield InMemoryTodoRepository()
