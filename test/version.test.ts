import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveAcpxVersion } from "../src/version.js";

test("resolveAcpxVersion prefers npm_package_version from env", () => {
  const version = resolveAcpxVersion({
    env: { npm_package_version: "9.9.9-ci" },
    packageJsonPath: "/definitely/missing/package.json",
  });
  assert.equal(version, "9.9.9-ci");
});

test("resolveAcpxVersion reads version from package.json when env is unset", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "acpx-version-test-"));
  try {
    const packagePath = path.join(tmpDir, "package.json");
    await fs.writeFile(
      packagePath,
      `${JSON.stringify({ name: "acpx", version: "1.2.3" }, null, 2)}\n`,
      "utf8",
    );
    const version = resolveAcpxVersion({
      env: {},
      packageJsonPath: packagePath,
    });
    assert.equal(version, "1.2.3");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("resolveAcpxVersion falls back to unknown when version cannot be resolved", () => {
  const version = resolveAcpxVersion({
    env: {},
    packageJsonPath: "/definitely/missing/package.json",
  });
  assert.equal(version, "0.0.0-unknown");
});
