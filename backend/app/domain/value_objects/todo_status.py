"""
Todoのステータスを表す値オブジェクト（Enum）。
"""
from enum import StrEnum


class TodoStatus(StrEnum):
    """ToDoのステータス。

    StrEnum を使うことで、JSONシリアライズ時に自動で文字列になる。
    """

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
