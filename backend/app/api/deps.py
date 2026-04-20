"""
FastAPI の Depends で使う依存関数の集合。

ここで「リポジトリ実装をユースケースに注入」を行う。
将来リポジトリ実装を変えたくなったら、ここだけ差し替える。
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.repositories.todo_repository import TodoRepository
from app.infrastructure.database import get_session
from app.infrastructure.repositories.todo_repository_impl import TodoRepositoryImpl
from app.usecase.todo_usecases import (
    CreateTodoUseCase,
    DeleteTodoUseCase,
    ListTodosUseCase,
    UpdateTodoUseCase,
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_todo_repository(session: SessionDep) -> TodoRepository:
    return TodoRepositoryImpl(session)


RepoDep = Annotated[TodoRepository, Depends(get_todo_repository)]


def get_create_todo_usecase(repo: RepoDep) -> CreateTodoUseCase:
    return CreateTodoUseCase(repo)


def get_list_todos_usecase(repo: RepoDep) -> ListTodosUseCase:
    return ListTodosUseCase(repo)


def get_update_todo_usecase(repo: RepoDep) -> UpdateTodoUseCase:
    return UpdateTodoUseCase(repo)


def get_delete_todo_usecase(repo: RepoDep) -> DeleteTodoUseCase:
    return DeleteTodoUseCase(repo)
