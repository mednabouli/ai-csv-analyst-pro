/**
 * @deprecated
 * ChatPanel has been superseded by the inline chat UI inside DashboardShell.
 * This file is kept to avoid stale-import build errors.
 * All chat state (useChat, messages, input) now lives in DashboardShell.tsx.
 *
 * The previous implementation used useOptimistic() outside a React transition,
 * which throws a warning in React 19 and causes UI glitches. That pattern is
 * fully removed — the AI SDK's useChat() hook handles optimistic message
 * display internally and correctly.
 */
export {};
