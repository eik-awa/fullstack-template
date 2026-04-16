/**
 * ToDo 関連の型定義。
 *
 * バックエンドのPydanticスキーマと対応している。
 * 実務では OpenAPI スキーマから自動生成する (openapi-typescript) と
 * 型のズレがなくなるが、研修では手書きして対応関係を体感する。
 */
export type TodoStatus = "pending" | "in_progress" | "done";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  due_date?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  due_date?: string | null;
}

export const statusLabels: Record<TodoStatus, string> = {
  pending: "未着手",
  in_progress: "進行中",
  done: "完了",
};
