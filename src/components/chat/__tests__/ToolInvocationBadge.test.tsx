import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// --- str_replace_editor labels ---

test("shows 'Creating <filename>' for str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows 'Editing <filename>' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/components/Button.tsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("shows 'Editing <filename>' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/styles.css" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Editing styles.css")).toBeDefined();
});

test("shows 'Viewing <filename>' for str_replace_editor view command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "view", path: "/lib/utils.ts" },
        state: "result",
        result: "file contents",
      }}
    />
  );
  expect(screen.getByText("Viewing utils.ts")).toBeDefined();
});

test("shows 'Reverting <filename>' for str_replace_editor undo_edit command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "undo_edit", path: "/components/Card.tsx" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Reverting Card.tsx")).toBeDefined();
});

// --- file_manager labels ---

test("shows 'Renaming <filename>' for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "rename", path: "/OldName.tsx", new_path: "/NewName.tsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );
  expect(screen.getByText("Renaming OldName.tsx")).toBeDefined();
});

test("shows 'Deleting <filename>' for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "delete", path: "/temp.tsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );
  expect(screen.getByText("Deleting temp.tsx")).toBeDefined();
});

// --- Fallback ---

test("falls back to raw tool name for unknown tool or missing path", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "unknown_tool",
        args: {},
        state: "result",
        result: "done",
      }}
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("falls back to raw tool name when path is missing", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

// --- State indicators ---

test("shows green dot when state is result with truthy result", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector("svg")).toBeNull();
});

test("shows spinner when state is not result", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );
  expect(container.querySelector("svg")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows spinner when state is result but result is falsy", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: undefined,
      }}
    />
  );
  expect(container.querySelector("svg")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});
