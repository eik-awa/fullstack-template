"""
Todo エンドポイント。

このモジュールの責務:
- HTTPリクエストを受ける
- スキーマ -> ユースケース入力 へ変換
- ユースケース実行
- ドメイン例外 -> HTTP例外 へ変換
- ユースケース出力 -> レスポンススキーマ へ変換

ビジネスロジックは書かない。
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import (
    get_create_todo_usecase,
    get_delete_todo_usecase,
    get_list_todos_usecase,
    get_update_todo_usecase,
)
from app.api.schemas.todo import TodoCreateRequest, TodoResponse, TodoUpdateRequest
from app.core.auth import CurrentUser, CurrentUserDep
from app.domain.entities.todo import DomainError
from app.usecase.todo_usecases import (
    CreateTodoInput,
    CreateTodoUseCase,
    DeleteTodoUseCase,
    ListTodosUseCase,
    TodoNotFoundError,
    UpdateTodoInput,
    UpdateTodoUseCase,
)

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=list[TodoResponse])
async def list_todos(
    user: Annotated[CurrentUser, CurrentUserDep],
    usecase: Annotated[ListTodosUseCase, Depends(get_list_todos_usecase)],
) -> list[TodoResponse]:
    todos = await usecase.execute(user.user_id)
    return [TodoResponse.from_domain(t) for t in todos]


@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(
    body: TodoCreateRequest,
    user: Annotated[CurrentUser, CurrentUserDep],
    usecase: Annotated[CreateTodoUseCase, Depends(get_create_todo_usecase)],
) -> TodoResponse:
    try:
        todo = await usecase.execute(
            CreateTodoInput(
                user_id=user.user_id,
                title=body.title,
                description=body.description,
                due_date=body.due_date,
            )
        )
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return TodoResponse.from_domain(todo)


@router.patch("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: UUID,
    body: TodoUpdateRequest,
    user: Annotated[CurrentUser, CurrentUserDep],
    usecase: Annotated[UpdateTodoUseCase, Depends(get_update_todo_usecase)],
) -> TodoResponse:
    try:
        todo = await usecase.execute(
            UpdateTodoInput(
                todo_id=todo_id,
                user_id=user.user_id,
                title=body.title,
                description=body.description,
                status=body.status,
                due_date=body.due_date,
            )
        )
    except TodoNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return TodoResponse.from_domain(todo)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: UUID,
    user: Annotated[CurrentUser, CurrentUserDep],
    usecase: Annotated[DeleteTodoUseCase, Depends(get_delete_todo_usecase)],
) -> None:
    try:
        await usecase.execute(todo_id, user.user_id)
    except TodoNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
