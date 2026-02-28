export { isAcpJsonRpcMessage } from "./acp-jsonrpc.js";

export function truncateInputPreview(message: string, maxChars = 200): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  if (maxChars <= 3) {
    return trimmed.slice(0, maxChars);
  }
  return `${trimmed.slice(0, maxChars - 3)}...`;
}
