# acpx

Headless CLI client for the [Agent Client Protocol (ACP)](https://agentclientprotocol.com) — talk to coding agents from the command line.

```bash
# One-shot: run a prompt against Codex, stream output, exit when done
acpx run --agent codex-acp --cwd ./my-project "Refactor the auth module"

# Multi-turn: create a session, send messages
acpx session create --agent codex-acp --cwd ./my-project
acpx session send <id> "Refactor the auth module"
acpx session send <id> "Now add tests"
acpx session close <id>
```

## Why?

ACP adapters exist for every major coding agent ([Codex](https://github.com/zed-industries/codex-acp), [Claude Code](https://github.com/zed-industries/claude-code-acp), [Gemini CLI](https://github.com/google-gemini/gemini-cli), etc.) but every ACP client is a GUI app or editor plugin.

`acpx` is the missing piece: a simple CLI that lets **agents talk to agents** (or humans script agents) over structured ACP instead of scraping terminal output.

## Install

```bash
npm install -g acpx
# or
npx acpx run --agent codex-acp "Hello"
```

### Prerequisites

You need an ACP-compatible agent installed:

```bash
# Codex
npm install -g @zed-industries/codex-acp

# Claude Code
npm install -g @zed-industries/claude-code-acp

# Gemini CLI (native ACP support)
npm install -g @google/gemini-cli
```

## Usage

### One-shot (`run`)

```bash
# Simple prompt
acpx run --agent codex-acp --cwd /repo "Fix the failing tests"

# Auto-approve all tool calls
acpx run --agent codex-acp --cwd /repo --approve-all "Build a REST API"

# JSON output for programmatic use
acpx run --agent codex-acp --cwd /repo --format json "Add logging"

# Pipe prompt from stdin
echo "Refactor to async/await" | acpx run --agent codex-acp --cwd /repo
```

### Multi-turn sessions

```bash
# Create session
acpx session create --agent codex-acp --cwd /repo
# → abc123

# Send messages (streams results, exits on completion)
acpx session send abc123 "Refactor the auth module"
acpx session send abc123 "Now add tests for it"

# List sessions
acpx session list

# Close when done
acpx session close abc123
```

### Output formats

| Format | Flag | Description |
|--------|------|-------------|
| text | `--format text` | Human-readable streaming (default) |
| json | `--format json` | Structured ndjson for machines |
| quiet | `--format quiet` | Final text output only |

## How it works

```
┌─────────┐     stdio/ndjson     ┌──────────────┐     wraps      ┌─────────┐
│  acpx   │ ◄──────────────────► │  ACP adapter  │ ◄───────────► │  Agent   │
│ (client) │    ACP protocol     │ (codex-acp)   │               │ (Codex)  │
└─────────┘                      └──────────────┘               └─────────┘
```

acpx spawns the ACP adapter as a child process, communicates over the ACP protocol (JSON-RPC over stdio), and translates structured events (tool calls, text, permissions) into CLI output.

## License

Apache-2.0
