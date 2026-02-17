# AGENTS.md — acpx

## What is acpx?

`acpx` is a headless, scriptable CLI client for the Agent Client Protocol (ACP). It lets AI agents (or humans) create sessions with ACP-compatible coding agents (Codex, Claude Code, Gemini CLI, etc.), send messages, stream structured results, and manage multiple concurrent sessions — all from the command line.

Think of it as "curl for ACP" — a simple, pipe-friendly tool that bridges the gap between agent harnesses (like OpenClaw) and coding agents, replacing raw PTY/terminal scraping with structured protocol communication.

## Why?

Today, when an AI orchestrator (like OpenClaw) wants to use Codex or Claude Code, it spawns them as raw terminal processes via node-pty and scrapes their output. This works but loses all structure — tool calls, permission requests, diffs, and session state are reduced to ANSI terminal text.

ACP adapters exist for all major coding agents (codex-acp, claude-code-acp, gemini-cli, etc.), but there's no headless CLI client that can talk to them programmatically. Every existing ACP client is either a GUI app, an editor plugin, or an interactive REPL.

`acpx` fills this gap.

## Architecture

```
┌─────────────┐     stdio/ndjson     ┌──────────────┐     wraps      ┌─────────┐
│   acpx CLI  │ ◄──────────────────► │  ACP adapter  │ ◄───────────► │  Agent   │
│  (client)   │     ACP protocol     │ (codex-acp)   │   internal    │ (Codex)  │
└─────────────┘                      └──────────────┘               └─────────┘
```

acpx spawns the ACP adapter as a child process, communicates over stdio using ndjson (JSON-RPC), and exposes simple CLI subcommands.

## Core Commands

### `acpx run` — One-shot execution (most common)
```bash
# Run a prompt against codex, stream output, exit when done
acpx run --agent codex-acp --cwd /path/to/repo "Refactor the auth module"

# Pipe-friendly: prompt from stdin
echo "Add error handling to all API calls" | acpx run --agent codex-acp --cwd /repo

# With specific agent args
acpx run --agent "npx @zed-industries/codex-acp" --cwd /repo "Build a REST API"

# Auto-approve all tool calls (yolo mode)
acpx run --agent codex-acp --cwd /repo --approve-all "Fix the tests"
```

### `acpx session` — Multi-turn session management
```bash
# Create a persistent session
acpx session create --agent codex-acp --cwd /repo
# → session:abc123

# Send a message, stream results, return when agent stops
acpx session send abc123 "Refactor the auth module"
# → streams tool calls, text chunks, etc.
# → exits with 0 when prompt completes

# Send another message to the same session
acpx session send abc123 "Now add tests for the refactored code"

# List active sessions
acpx session list

# Close/destroy a session
acpx session close abc123
```

### Global Options
```
--agent <command>     ACP agent command (e.g. "codex-acp", "claude-code-acp", "npx @zed-industries/codex-acp")
--cwd <dir>           Working directory for the session (default: .)
--approve-all         Auto-approve all tool permission requests
--format <fmt>        Output format: "text" (default, human-readable), "json" (structured ndjson), "quiet" (minimal)
--timeout <seconds>   Maximum time to wait for agent response
--verbose             Show ACP protocol debug info on stderr
```

## Output Formats

### text (default) — Human-readable streaming
```
[tool] read_file: src/auth.ts (completed)
[tool] edit_file: src/auth.ts (running)

Refactored the auth module to use async/await...

[tool] run_command: npm test (completed)
All 42 tests passing.

[done] end_turn
```

### json — Structured ndjson for programmatic consumption
```json
{"type":"tool_call","title":"read_file: src/auth.ts","status":"completed","timestamp":"..."}
{"type":"text","content":"Refactored the auth module..."}
{"type":"tool_call","title":"run_command: npm test","status":"completed","timestamp":"..."}
{"type":"done","stopReason":"end_turn","timestamp":"..."}
```

### quiet — Just the final text output
```
Refactored the auth module to use async/await. All 42 tests passing.
```

## Session Persistence

Sessions are stored as JSON files in `~/.acpx/sessions/` so they survive process restarts. Each session file contains:
- Session ID
- Agent command used
- Working directory
- ACP connection state
- Created/last-used timestamps

The agent subprocess is re-spawned on `session send` if it's not running (using ACP's `loadSession` capability if the agent supports it).

## Permission Handling

By default, acpx prompts on stderr for dangerous tool calls (writes, executes). Options:
- `--approve-all` — auto-approve everything (like codex --yolo)
- `--approve-reads` — auto-approve reads/searches, prompt for writes (default)
- `--deny-all` — deny all permission requests (read-only mode)

## Exit Codes

| Code | Meaning |
|------|---------|
| 0    | Success (agent completed normally) |
| 1    | Agent error / protocol error |
| 2    | CLI usage error |
| 3    | Timeout |
| 4    | Agent permission denied (all options rejected) |
| 130  | Interrupted (Ctrl+C) |

## Tech Stack

- **Language**: TypeScript
- **ACP SDK**: `@agentclientprotocol/sdk` (official TypeScript SDK)
- **CLI framework**: Keep it minimal — `commander` or just manual arg parsing
- **Build**: tsup or tsc, ship as a single bin
- **Package**: `acpx` on npm, under `@janitrai/acpx` scoped
- **Runtime**: Node.js 18+
- **No other dependencies** if possible — keep it lean

## Project Structure

```
acpx/
├── src/
│   ├── cli.ts              # CLI entry point, arg parsing
│   ├── client.ts           # ACP client wrapper (spawn agent, initialize, manage connection)
│   ├── session.ts          # Session create/send/list/close logic
│   ├── permissions.ts      # Permission request handling (auto-approve, prompt, deny)
│   ├── output.ts           # Output formatters (text, json, quiet)
│   └── types.ts            # Shared types
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE                 # Apache-2.0
└── AGENTS.md               # This file
```

## Implementation Notes

- Use `@agentclientprotocol/sdk`'s `ClientSideConnection`, `ndJsonStream`, and `PROTOCOL_VERSION`
- Spawn agent as child process with `stdio: ['pipe', 'pipe', 'inherit']` (stderr passthrough)
- The `run` command is syntactic sugar for: create session → send prompt → wait for completion → exit
- Stream `sessionUpdate` notifications to stdout in chosen format as they arrive
- For `session send`, reconnect to an existing session by re-spawning the agent and using `loadSession` if available, otherwise `newSession`
- `clientCapabilities` should advertise `fs: { readTextFile: true, writeTextFile: true }` and `terminal: true`
- Handle SIGINT gracefully: kill agent subprocess, clean up session files

## ACP Protocol Reference

Key ACP SDK types and methods used:
- `ClientSideConnection` — client-side connection manager
- `ndJsonStream(input, output)` — create ndjson transport over stdio
- `connection.initialize({ protocolVersion, clientCapabilities, clientInfo })` — handshake
- `connection.newSession({ cwd, mcpServers })` — create session
- `connection.loadSession({ sessionId })` — resume session (if agent supports it)
- `connection.prompt({ sessionId, prompt: [{ type: "text", text }] })` — send message
- `SessionNotification.update.sessionUpdate` values:
  - `"agent_message_chunk"` — text content from agent
  - `"tool_call"` — tool invocation (title, status)
  - `"tool_call_update"` — tool progress update
  - `"plan"` — agent execution plan
  - `"agent_thought_chunk"` — thinking/reasoning content
- `RequestPermissionRequest` — permission prompt with options
- `RequestPermissionResponse` — outcome: selected/cancelled

## Reference Implementations

Study these for patterns:
- OpenClaw's ACP client: `/home/bob/openclaw/src/acp/client.ts` (see `createAcpClient()` and `runAcpClientInteractive()`)
- ACP SDK example: `/tmp/acp-sdk/src/examples/client.ts`
- Codex ACP adapter: `https://github.com/zed-industries/codex-acp`

## Non-Goals (for v1)

- No remote/HTTP transport (stdio only for now)
- No MCP server passthrough (empty `mcpServers: []`)
- No agent discovery/registry integration
- No daemon mode (acpx is stateless between invocations, agent subprocess lives only during command execution)
