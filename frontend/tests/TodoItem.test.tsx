/**
 * コンポーネントのサンプルテスト。
 *
 * TanStack Query を使うコンポーネントは QueryClientProvider で
 * ラップする必要がある点に注意。実務ではこれを renderWithProviders()
 * のようなヘルパーにまとめる。
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TodoItem } from "@/features/todos/components/TodoItem";
import type { Todo } from "@/features/todos/types";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

const mockTodo: Todo = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "テストタスク",
  description: "詳細テキスト",
  status: "pending",
  due_date: null,
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("TodoItem", () => {
  it("タイトルと詳細が表示される", () => {
    renderWithQuery(<TodoItem todo={mockTodo} />);
    expect(screen.getByText("テストタスク")).toBeInTheDocument();
    expect(screen.getByText("詳細テキスト")).toBeInTheDocument();
  });

  it("ステータスバッジが表示される", () => {
    renderWithQuery(<TodoItem todo={mockTodo} />);
    expect(screen.getByText("未着手", { selector: "span" })).toBeInTheDocument();
  });
});
