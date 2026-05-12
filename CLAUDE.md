# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

- Use comments sparingly. Only comment complex or non-obvious code.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run Vitest test suite
npm run db:reset     # Force reset the Prisma/SQLite database
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

Environment: copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Without an API key, the app falls back to a mock provider that returns a static component.

## Architecture

UIGen is a Next.js 15 (App Router) AI-powered React component generator. Users describe components in a chat interface; Claude generates and iteratively modifies them via tool calls; a sandboxed iframe renders a live preview.

### Request Flow

1. User sends a message from `ChatContext` → POST `/api/chat`
2. The API route attaches the current virtual filesystem as context and calls Claude with two tools: `str_replace_editor` and `file_manager`
3. Streaming tool calls are consumed client-side by `ChatContext`, which dispatches file operations to `FileSystemContext`
4. `FileSystemContext` holds the in-memory `VirtualFileSystem` instance and notifies subscribers on every change
5. `PreviewFrame` picks up the changed files, transforms JSX via Babel (`@babel/standalone`) in the browser, builds an import map (esm.sh for npm packages, blob URLs for local modules), and renders everything in a sandboxed iframe

### Virtual File System (`src/lib/file-system.ts`)

The core abstraction. `VirtualFileSystem` is a plain class (no disk I/O) with create/read/update/delete/rename/list operations. It serializes to/from JSON for database persistence. Every project's code lives entirely in this structure. `/App.jsx` is the mandatory entry point.

### AI Tools (`src/lib/tools/`)

- **`str_replace_editor`** — view, create, str_replace, insert operations on files; this is the primary way Claude writes code
- **`file_manager`** — rename and delete operations

Both tools are defined using Zod schemas and integrated via the Vercel AI SDK. The system prompt (`src/lib/prompts/generation.tsx`) constrains Claude to use Tailwind CSS only, keep `@/` import aliases, and maintain `/App.jsx` as the entry point.

### JSX Transformation (`src/lib/transform/jsx-transformer.ts`)

Runs entirely in the browser. Transforms JSX → JS with Babel, rewrites bare specifiers to esm.sh CDN URLs, and converts local `@/` imports to blob URLs generated from the virtual filesystem. The preview iframe is rebuilt on every filesystem change.

### Authentication (`src/lib/auth.ts`, `src/actions/index.ts`)

JWT sessions (7-day, httpOnly cookie). Anonymous users can work freely — their projects are not persisted. Authenticated users get project persistence via SQLite/Prisma. `middleware.ts` enforces auth on protected API routes.

### Database (`prisma/schema.prisma`)

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.

Two models: `User` and `Project`. `Project.data` stores the serialized `VirtualFileSystem` as JSON. `Project.messages` stores the chat history as a JSON array.

### Context Providers

- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — owns the `VirtualFileSystem` instance, exposes file CRUD and syncs to the database for authenticated users
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — manages messages and wires Vercel AI SDK streaming to `FileSystemContext` tool handlers

### Testing

Tests live in `src/**/__tests__/` and use Vitest with jsdom + React Testing Library. Focus is on `VirtualFileSystem` unit tests and context-level integration tests.
