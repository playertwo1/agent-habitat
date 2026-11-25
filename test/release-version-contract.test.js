"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { resolveTagName, verifyReleaseVersion } = require("../scripts/verify-release-version");

function makeFixture(t, { packageVersion = "1.2.3", lockVersion = packageVersion,
  rootVersion = packageVersion, releaseVersion = packageVersion } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clawd-release-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "docs", "releases"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: packageVersion }));
  fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({
    version: lockVersion,
    packages: { "": { version: rootVersion } },
  }));
  if (releaseVersion) {
    fs.writeFileSync(path.join(root, "docs", "releases", `release-v${releaseVersion}.md`), "# release\n");
  }
  return root;
}

test("the current checkout declares a valid semver package version and tracks local-only CI", () => {
  const root = path.join(__dirname, "..");
  const pkg = require(path.join(root, "package.json"));
  assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.strictEqual(fs.existsSync(path.join(root, ".github", "workflows")), false);
});

test("package, lock root, release note, and tag must agree exactly", (t) => {
  const root = makeFixture(t, { lockVersion: "1.2.2", rootVersion: "1.2.1", releaseVersion: "" });
  const result = verifyReleaseVersion({
    root,
    env: { GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "v1.2.4" },
  });

  assert.strictEqual(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.includes("package-lock.json version")));
  assert.ok(result.errors.some((entry) => entry.includes("package-lock root version")));
  assert.ok(result.errors.some((entry) => entry.includes("missing release note")));
  assert.ok(result.errors.some((entry) => entry.includes("must exactly equal")));
});

test("branch workflow refs are ignored while tag refs are enforced", () => {
  assert.strictEqual(resolveTagName({ GITHUB_REF_TYPE: "branch", GITHUB_REF_NAME: "main" }), "");
  assert.strictEqual(resolveTagName({ GITHUB_REF: "refs/tags/v2.0.0" }), "v2.0.0");
});

test("local-only policy removes GitHub Actions workflows while retaining release version verifier", () => {
  assert.strictEqual(fs.existsSync(path.join(__dirname, "..", ".github", "workflows")), false);
  assert.strictEqual(
    fs.existsSync(path.join(__dirname, "..", "scripts", "verify-release-version.js")),
    true,
  );
});
