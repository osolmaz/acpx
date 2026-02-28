import assert from "node:assert/strict";
import test from "node:test";
import { isAcpJsonRpcMessage } from "../src/acp-jsonrpc.js";

test("isAcpJsonRpcMessage accepts JSON-RPC request", () => {
  assert.equal(
    isAcpJsonRpcMessage({
      jsonrpc: "2.0",
      id: "req-1",
      method: "session/prompt",
      params: {
        sessionId: "session-1",
        prompt: [{ type: "text", text: "hi" }],
      },
    }),
    true,
  );
});

test("isAcpJsonRpcMessage accepts JSON-RPC notification", () => {
  assert.equal(
    isAcpJsonRpcMessage({
      jsonrpc: "2.0",
      method: "session/update",
      params: {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "hello" },
        },
      },
    }),
    true,
  );
});

test("isAcpJsonRpcMessage accepts JSON-RPC success response", () => {
  assert.equal(
    isAcpJsonRpcMessage({
      jsonrpc: "2.0",
      id: "req-1",
      result: { stopReason: "end_turn" },
    }),
    true,
  );
});

test("isAcpJsonRpcMessage accepts JSON-RPC error response", () => {
  assert.equal(
    isAcpJsonRpcMessage({
      jsonrpc: "2.0",
      id: "req-1",
      error: {
        code: -32000,
        message: "runtime error",
      },
    }),
    true,
  );
});

test("isAcpJsonRpcMessage rejects non-JSON-RPC payload", () => {
  assert.equal(
    isAcpJsonRpcMessage({
      type: "custom_event",
      content: "hello",
    }),
    false,
  );
});
