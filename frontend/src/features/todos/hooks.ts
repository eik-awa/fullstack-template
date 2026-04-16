/**
 * ToDoの状態管理フック。
 *
 * TanStack Query でサーバ状態を扱う。
 * - キャッシュキーは ['todos'] に統一
 * - Mutation 成功時に invalidateQueries でキャッシュ破棄 → 自動再取得
 *
 * 研修メモ: サーバ状態 (Todoリスト) と UI状態 (フォームの入力値) は
 * 分けて扱う。ここはサーバ状態のみ。UI状態は Zustand や useState で。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { todoApi } from "./api";
import type { CreateTodoInput, Todo, UpdateTodoInput } from "./types";

const TODOS_KEY = ["todos"] as const;

export function useTodos() {
  return useQuery<Todo[]>({
    queryKey: TODOS_KEY,
    queryFn: todoApi.list,
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTodoInput) => todoApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTodoInput }) =>
      todoApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => todoApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });
}
