/**
 * ToDo API 呼び出し。
 * hooks.ts の TanStack Query から呼ばれる。
 */
import { apiClient } from "@/lib/apiClient";
import type { CreateTodoInput, Todo, UpdateTodoInput } from "./types";

export const todoApi = {
  list: async (): Promise<Todo[]> => {
    const { data } = await apiClient.get<Todo[]>("/api/v1/todos");
    return data;
  },

  create: async (input: CreateTodoInput): Promise<Todo> => {
    const { data } = await apiClient.post<Todo>("/api/v1/todos", input);
    return data;
  },

  update: async (id: string, input: UpdateTodoInput): Promise<Todo> => {
    const { data } = await apiClient.patch<Todo>(`/api/v1/todos/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/todos/${id}`);
  },
};
