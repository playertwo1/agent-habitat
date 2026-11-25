const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { describe, it } = require("node:test");
const yaml = require("js-yaml");

const pkg = require("../package.json");
const {
  BUILDER_ARCH_TO_WINGET,
  isDelimitedAt,
  resolveArchitecture,
  readWindowsBuildConfig,
  materializeName,
  downloadUrl,
  normalizeAssets,
  verifyWingetArchContract,
  parseArgs,
  runCli,
} = require("../scripts/verify-winget-arch-contract.js");

const RELEASE_BASE =
  "https://github.com/rullerzhou-afk/clawd-on-desk/releases/download/v0.14.0";

const LOCAL_INSTALLERS_REGEX = "^Agent-Habitat-Setup-.*-(x64|arm64)\\.exe$";

function configWith() {
  return {
    version: "0.14.0",
    build: {
      publish: [{ provider: "github", owner: "rullerzhou-afk", repo: "clawd-on-desk" }],
      win: {
        artifactName: "Clawd-on-Desk-Setup-${version}-${arch}.${ext}",
        target: [{ target: "nsis", arch: ["x64", "arm64"] }],
      },
    },
  };
}

const X64_ASSET = {
  name: "Clawd-on-Desk-Setup-0.14.0-x64.exe",
  digest: "sha256:3733d49f918d5dccbdeaf00daf926938c8bc657f1bea81caf6bfb43de3cb4efb",
  size: 128223329,
};
const ARM64_ASSET = {
  name: "Clawd-on-Desk-Setup-0.14.0-arm64.exe",
  digest: "sha256:0e4d6527603a924394697ccb0648b09c146a5c39f8bd725c481d4bbca0177a42",
  size: 129682958,
};

describe("winget architecture resolver (ported from winget-types from_url)", () => {
  it("resolves our shipped installer names to distinct architectures", () => {
    assert.equal(
      resolveArchitecture(`${RELEASE_BASE}/Clawd-on-Desk-Setup-0.14.0-x64.exe`).architecture,
      "x64",
    );
    assert.equal(
      resolveArchitecture(`${RELEASE_BASE}/Clawd-on-Desk-Setup-0.14.0-arm64.exe`).architecture,
      "arm64",
    );
  });

  it("prefers arm64 over the shorter arm token", () => {
    const resolved = resolveArchitecture(
      `${RELEASE_BASE}/Clawd-on-Desk-Setup-0.14.0-arm64.exe`,
    );
    assert.equal(resolved.matched, "arm64");
  });

  it("prefers the longer name when two tokens start at the same offset", () => {
    const resolved = resolveArchitecture(`${RELEASE_BASE}/app-x86_64.exe`);
    assert.equal(resolved.matched, "x86_64");
    assert.equal(resolved.architecture, "x64");
  });

  it("prefers the rightmost delimited token", () => {
    assert.equal(
      resolveArchitecture(`${RELEASE_BASE}/x64-tools/app-arm64.exe`).architecture,
      "arm64",
    );
  });

  it("narrows upstream: a token upstream would rescue resolves to null", () => {
    // Real upstream resolves this to x64 through its `{arch}.{ext}` fallback,
    // which is deliberately not ported.
    assert.equal(resolveArchitecture("https://example.com/installerx64.exe").architecture, null);
  });

  it("treats a token at index 0 as undelimited", () => {
    assert.equal(isDelimitedAt("x64.exe", 0, 3), false);
    assert.equal(resolveArchitecture("x64.exe").architecture, null);
  });

  it("requires a delimiter on both sides", () => {
    assert.equal(isDelimitedAt("app-x64.exe", 4, 3), true);
    assert.equal(isDelimitedAt("app-x64", 4, 3), false, "token running to end of string");
  });

  it("is case insensitive", () => {
    assert.equal(resolveArchitecture(`${RELEASE_BASE}/App-ARM64.EXE`).architecture, "arm64");
  });
});

describe("winget architecture contract", () => {
  it("passes for the current package.json", () => {
    const report = verifyWingetArchContract();
    assert.deepEqual(report.errors, [], report.errors.join("\n"));
    assert.equal(report.installers.length, 2);
  });

  it("maps every shipped Windows target to the architecture it claims", () => {
    for (const installer of verifyWingetArchContract().installers) {
      assert.equal(
        installer.resolvedArchitecture,
        installer.expectedArchitecture,
        `${installer.filename} must resolve to ${installer.expectedArchitecture}`,
      );
    }
  });

  it("detects two targets collapsing onto one architecture, in isolation", () => {
    const config = configWith();
    config.build.win.target = [{ target: "nsis", arch: ["x64", "x64"] }];
    const report = verifyWingetArchContract({ config });
    assert.equal(report.errors.length, 1, report.errors.join("\n"));
    assert.match(report.errors[0], /do not resolve to distinct architectures/);
  });

  it("detects a filename resolving to the wrong architecture, in isolation", () => {
    const config = configWith();
    config.build.win.artifactName = "Clawd-on-Desk-Setup-${version}-${arch}-x64.${ext}";
    config.build.win.target = [{ target: "nsis", arch: ["arm64"] }];
    const report = verifyWingetArchContract({ config });
    assert.equal(report.errors.length, 1, report.errors.join("\n"));
    assert.match(report.errors[0], /resolves to WinGet architecture "x64"/);
  });

  it("fails when the ${arch} token is dropped from artifactName", () => {
    const config = configWith();
    config.build.win.artifactName = "Clawd-on-Desk-Setup-${version}.${ext}";
    const report = verifyWingetArchContract({ config });
    assert.ok(
      report.errors.some((error) => error.includes("${arch} token")),
      report.errors.join("\n"),
    );
  });

  it("fails when ${arch} is present but produces an undelimited name", () => {
    const config = configWith();
    config.build.win.artifactName = "Clawd-on-Desk-Setup-${version}${arch}.${ext}";
    const report = verifyWingetArchContract({ config });
    assert.ok(
      report.errors.some((error) => error.includes("No delimited architecture token")),
      report.errors.join("\n"),
    );
  });

  it("fails when artifactName is missing entirely", () => {
    const config = configWith();
    delete config.build.win.artifactName;
    const report = verifyWingetArchContract({ config });
    assert.ok(
      report.errors.some((error) => error.includes("artifactName is missing")),
      report.errors.join("\n"),
    );
  });

  it("fails when a target leaves its architecture implicit", () => {
    const config = configWith();
    config.build.win.target = ["nsis"];
    const report = verifyWingetArchContract({ config });
    assert.ok(
      report.errors.some((error) => error.includes("leaves arch implicit")),
      report.errors.join("\n"),
    );
  });

  it("fails when no architectures are declared at all", () => {
    const config = configWith();
    config.build.win.target = [];
    const report = verifyWingetArchContract({ config });
    assert.ok(
      report.errors.some((error) => error.includes("declares no architectures")),
      report.errors.join("\n"),
    );
  });

  it("fails on an electron-builder arch with no WinGet mapping", () => {
    const config = configWith();
    config.build.win.target = [{ target: "nsis", arch: ["x64", "riscv64"] }];
    const report = verifyWingetArchContract({ config });
    assert.ok(
      report.errors.some((error) => error.includes("BUILDER_ARCH_TO_WINGET")),
      report.errors.join("\n"),
    );
  });

  it("fails on a Windows target with no extension mapping", () => {
    const config = configWith();
    config.build.win.target = [{ target: "msi", arch: ["x64"] }];
    const report = verifyWingetArchContract({ config });
    assert.ok(
      report.errors.some((error) => error.includes("TARGET_EXTENSION")),
      report.errors.join("\n"),
    );
  });

  it("fails when build.publish is missing", () => {
    const config = configWith();
    delete config.build.publish;
    const report = verifyWingetArchContract({ config });
    assert.ok(
      report.errors.some((error) => error.includes("build.publish")),
      report.errors.join("\n"),
    );
  });

  it("pins the electron-builder to WinGet architecture mapping", () => {
    assert.deepEqual(BUILDER_ARCH_TO_WINGET, {
      x64: "x64",
      arm64: "arm64",
      ia32: "x86",
      armv7l: "arm",
    });
  });
});

describe("winget contract required-architecture set", () => {
  // Distinctness alone permits shipping a single architecture: with one entry
  // the collision check is skipped and everything else passes.
  it("rejects a build that would publish only x64", () => {
    const config = configWith();
    config.build.win.target = [{ target: "nsis", arch: ["x64"] }];
    const report = verifyWingetArchContract({
      config,
      requiredArchitectures: ["x64", "arm64"],
      assets: [X64_ASSET],
    });
    assert.ok(
      report.errors.some((error) => error.includes("Published architectures must be exactly")),
      report.errors.join("\n"),
    );
    assert.deepEqual(report.komacUrls, []);
  });

  it("rejects a build that would publish an extra architecture", () => {
    const config = configWith();
    config.build.win.target = [{ target: "nsis", arch: ["x64", "arm64", "ia32"] }];
    const report = verifyWingetArchContract({
      config,
      requiredArchitectures: ["x64", "arm64"],
    });
    assert.ok(
      report.errors.some((error) => error.includes("Published architectures must be exactly")),
      report.errors.join("\n"),
    );
  });

  it("accepts the required set regardless of declaration order", () => {
    const report = verifyWingetArchContract({
      config: configWith(),
      requiredArchitectures: ["arm64", "x64"],
    });
    assert.deepEqual(report.errors, [], report.errors.join("\n"));
    assert.deepEqual(report.requiredArchitectures, ["arm64", "x64"]);
  });
});

describe("winget contract release-tag binding", () => {
  // Installer URLs come from package.json; the manifest version comes from the
  // tag. A tag cut without bumping package.json would cross the two.
  it("rejects a tag that does not match package.json", () => {
    const report = verifyWingetArchContract({ config: configWith(), releaseTag: "v0.15.0" });
    assert.ok(
      report.errors.some((error) => error.includes("does not match package.json version")),
      report.errors.join("\n"),
    );
    assert.deepEqual(report.komacUrls, []);
  });

  it("accepts the matching tag", () => {
    const report = verifyWingetArchContract({ config: configWith(), releaseTag: "v0.14.0" });
    assert.deepEqual(report.errors, [], report.errors.join("\n"));
  });

  it("rejects a bare version with no v prefix", () => {
    const report = verifyWingetArchContract({ config: configWith(), releaseTag: "0.14.0" });
    assert.ok(report.errors.length > 0, "expected a tag mismatch");
  });
});

describe("winget contract komac arguments", () => {
  it("emits one explicit |architecture override per installer", () => {
    const report = verifyWingetArchContract({ config: configWith() });
    assert.deepEqual(report.komacUrls, [
      `${RELEASE_BASE}/Clawd-on-Desk-Setup-0.14.0-x64.exe|x64`,
      `${RELEASE_BASE}/Clawd-on-Desk-Setup-0.14.0-arm64.exe|arm64`,
    ]);
  });

  it("emits nothing when the contract fails", () => {
    const config = configWith();
    config.build.win.target = [{ target: "nsis", arch: ["x64", "x64"] }];
    const report = verifyWingetArchContract({ config });
    assert.ok(report.errors.length > 0);
    assert.deepEqual(report.komacUrls, []);
  });

  it("builds each URL from the release tag and filename", () => {
    assert.equal(
      downloadUrl({
        owner: "rullerzhou-afk",
        repo: "clawd-on-desk",
        version: "1.2.3",
        filename: "x.exe",
      }),
      "https://github.com/rullerzhou-afk/clawd-on-desk/releases/download/v1.2.3/x.exe",
    );
  });
});

describe("winget contract release-asset cross-check", () => {
  it("passes when the release carries exactly the expected installers", () => {
    const report = verifyWingetArchContract({
      config: configWith(),
      assets: [X64_ASSET, ARM64_ASSET, { name: "latest.yml", digest: "sha256:aa", size: 1 }],
    });
    assert.deepEqual(report.errors, [], report.errors.join("\n"));
    assert.equal(report.assetsChecked, 3);
  });

  it("records each installer's digest and size in the report", () => {
    const report = verifyWingetArchContract({
      config: configWith(),
      assets: [X64_ASSET, ARM64_ASSET],
    });
    const byName = Object.fromEntries(report.installers.map((i) => [i.filename, i]));
    assert.equal(byName[X64_ASSET.name].digest, X64_ASSET.digest);
    assert.equal(byName[ARM64_ASSET.name].size, ARM64_ASSET.size);
  });

  it("fails when an expected installer is absent from the release", () => {
    const report = verifyWingetArchContract({ config: configWith(), assets: [X64_ASSET] });
    assert.ok(
      report.errors.some((error) => error.includes("missing the expected installer")),
      report.errors.join("\n"),
    );
  });

  it("fails on a stray asset that would also match the installer regex", () => {
    const report = verifyWingetArchContract({
      config: configWith(),
      assets: [
        X64_ASSET,
        ARM64_ASSET,
        { name: "Clawd-on-Desk-Portable-0.14.0.exe", digest: "sha256:bb", size: 1 },
      ],
    });
    assert.ok(
      report.errors.some((error) => error.includes("Unexpected asset")),
      report.errors.join("\n"),
    );
  });

  it("fails when both installers are the same binary", () => {
    // Exactly what shipped: two names, one file, identical SHA256. The explicit
    // |arch override would then label real arm64 content as x64.
    const report = verifyWingetArchContract({
      config: configWith(),
      assets: [X64_ASSET, { ...ARM64_ASSET, digest: X64_ASSET.digest }],
    });
    assert.ok(
      report.errors.some((error) => error.includes("share a digest")),
      report.errors.join("\n"),
    );
    assert.deepEqual(report.komacUrls, []);
  });

  it("fails when an installer asset carries no digest to pin", () => {
    const report = verifyWingetArchContract({
      config: configWith(),
      assets: [X64_ASSET, { ...ARM64_ASSET, digest: "" }],
    });
    assert.ok(
      report.errors.some((error) => error.includes("no digest to pin")),
      report.errors.join("\n"),
    );
  });

  it("fails on a digest that is not sha256:<64 hex>", () => {
    // Two arbitrary non-empty strings would otherwise satisfy distinctness and
    // pin nothing at all.
    const report = verifyWingetArchContract({
      config: configWith(),
      assets: [
        { ...X64_ASSET, digest: "a" },
        { ...ARM64_ASSET, digest: "b" },
      ],
    });
    assert.equal(
      report.errors.filter((error) => error.includes("unrecognized digest")).length,
      2,
      report.errors.join("\n"),
    );
    assert.deepEqual(report.komacUrls, []);
  });

  it("fails when the release lists the same asset name twice", () => {
    const report = verifyWingetArchContract({
      config: configWith(),
      assets: [X64_ASSET, ARM64_ASSET, { ...X64_ASSET, digest: "sha256:" + "d".repeat(64) }],
    });
    assert.ok(
      report.errors.some((error) => error.includes("duplicate asset names")),
      report.errors.join("\n"),
    );
  });

  it("does not claim a distinct digest proves the architecture", () => {
    // Swapping the two binaries passes every check here. This test exists to
    // record that limitation, not to assert a guarantee we do not have.
    const report = verifyWingetArchContract({
      config: configWith(),
      assets: [
        { ...X64_ASSET, digest: ARM64_ASSET.digest },
        { ...ARM64_ASSET, digest: X64_ASSET.digest },
      ],
    });
    assert.deepEqual(report.errors, [], "content-swap is out of scope for this gate");
  });
});

describe("winget contract installers-regex cross-check", () => {
  it("matches every installer the contract expects", () => {
    const report = verifyWingetArchContract({ installersRegex: LOCAL_INSTALLERS_REGEX });
    assert.deepEqual(report.errors, [], report.errors.join("\n"));
  });

  it("selects both architectures, never a single one", () => {
    const matcher = new RegExp(LOCAL_INSTALLERS_REGEX);
    const matched = verifyWingetArchContract().installers.filter((installer) =>
      matcher.test(installer.filename),
    );
    assert.equal(matched.length, 2, "a regex matching one installer republishes the bug");
    assert.deepEqual(
      matched.map((installer) => installer.resolvedArchitecture).sort(),
      ["arm64", "x64"],
    );
  });

  it("fails when the regex misses an expected installer", () => {
    const report = verifyWingetArchContract({
      installersRegex: "^Clawd-on-Desk-Setup-.*-x64\\.exe$",
    });
    assert.ok(
      report.errors.some((error) => error.includes("does not match the WinGet installers-regex")),
      report.errors.join("\n"),
    );
  });

  it("uses the regex, not the .exe suffix, to spot stray assets", () => {
    const report = verifyWingetArchContract({
      config: configWith(),
      installersRegex: "^Clawd-on-Desk-Setup-.*-(x64|arm64)\\.(exe|msi)$",
      assets: [
        X64_ASSET,
        ARM64_ASSET,
        { name: "Clawd-on-Desk-Setup-0.14.0-x64.msi", digest: "sha256:cc", size: 1 },
      ],
    });
    assert.ok(
      report.errors.some((error) => error.includes("Unexpected asset")),
      report.errors.join("\n"),
    );
  });

  it("reports an unusable regex rather than ignoring it", () => {
    const report = verifyWingetArchContract({ installersRegex: "([" });
    assert.ok(
      report.errors.some((error) => error.includes("not a valid regular expression")),
      report.errors.join("\n"),
    );
  });

  it("accepts the required x64 and arm64 architecture set", () => {
    const report = verifyWingetArchContract({ requiredArchitectures: ["x64", "arm64"] });
    assert.deepEqual(report.errors, [], report.errors.join("\n"));
  });
});

describe("winget contract helpers", () => {
  it("reads the Windows build config from package.json", () => {
    const build = readWindowsBuildConfig(pkg);
    assert.equal(build.owner, "playertwo1");
    assert.equal(build.repo, "agent-habitat");
    assert.ok(build.entries.length >= 1);
  });

  it("materializes every artifactName token", () => {
    assert.equal(
      materializeName("Clawd-on-Desk-Setup-${version}-${arch}.${ext}", {
        version: "1.2.3",
        arch: "arm64",
        ext: "exe",
      }),
      "Clawd-on-Desk-Setup-1.2.3-arm64.exe",
    );
  });

  it("normalizes both bare and wrapped asset payloads", () => {
    assert.deepEqual(normalizeAssets([X64_ASSET]), [X64_ASSET]);
    assert.deepEqual(normalizeAssets({ assets: [X64_ASSET] }), [X64_ASSET]);
  });

  it("rejects an asset payload that is neither shape", () => {
    assert.throws(() => normalizeAssets({ nope: 1 }), /JSON array/);
  });

  it("rejects a non-object asset entry by index", () => {
    assert.throws(() => normalizeAssets([X64_ASSET, null]), /assets\[1\] is not an object/);
  });

  it("rejects unknown CLI arguments", () => {
    assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);
  });

  it("parses every supported CLI argument", () => {
    assert.deepEqual(
      parseArgs([
        "--assets-file", "a.json",
        "--output", "b.json",
        "--installers-regex", "^x$",
        "--require-architectures", "x64,arm64",
        "--release-tag", "v1.0.0",
        "--package-json", "tagged.json",
      ]),
      {
        assetsFile: "a.json",
        output: "b.json",
        installersRegex: "^x$",
        requireArchitectures: "x64,arm64",
        releaseTag: "v1.0.0",
        packageJson: "tagged.json",
      },
    );
  });
});

describe("winget contract tagged build configuration", () => {
  // The tooling checkout and the release's build config come from different
  // trees; --package-json is what keeps the installer URLs tied to the tag.
  it("reads the build config from the given file, not the repo's own", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "winget-cfg-"));
    const configPath = path.join(dir, "tagged-package.json");
    const output = path.join(dir, "report.json");
    const tagged = configWith();
    tagged.version = "0.9.9";
    fs.writeFileSync(configPath, JSON.stringify(tagged), "utf8");

    const code = runCli([
      "--package-json", configPath,
      "--release-tag", "v0.9.9",
      "--output", output,
    ]);
    assert.equal(code, 0, "the tagged config must be the one that is checked");

    const report = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(report.version, "0.9.9");
    assert.ok(
      report.installers.every((installer) => installer.url.includes("/v0.9.9/")),
      "installer URLs must come from the tagged version",
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("still catches a tag that disagrees with the tagged config", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "winget-cfg-"));
    const configPath = path.join(dir, "tagged-package.json");
    const output = path.join(dir, "report.json");
    fs.writeFileSync(configPath, JSON.stringify(configWith()), "utf8");

    const code = runCli([
      "--package-json", configPath,
      "--release-tag", "v0.9.9",
      "--output", output,
    ]);
    assert.equal(code, 1);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("winget contract CLI", () => {
  function scratch() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "winget-arch-"));
  }

  it("writes a JSON evidence manifest and exits zero", () => {
    const dir = scratch();
    const output = path.join(dir, "winget-arch.json");
    assert.equal(runCli(["--output", output]), 0);
    const report = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(report.schemaVersion, 2);
    assert.equal(report.errors.length, 0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("exits non-zero and records the failure when the release is incomplete", () => {
    // Covers the whole CI path: --assets-file is read and fed into the contract,
    // and the exit code the workflow gate relies on is actually non-zero.
    const dir = scratch();
    const assetsFile = path.join(dir, "assets.json");
    const output = path.join(dir, "winget-arch.json");
    const version = pkg.version;
    fs.writeFileSync(
      assetsFile,
      JSON.stringify([
        { name: `Agent-Habitat-Setup-${version}-x64.exe`, digest: "sha256:aa", size: 1 },
        { name: "latest.yml", digest: "sha256:bb", size: 2 },
      ]),
      "utf8",
    );

    assert.equal(runCli(["--assets-file", assetsFile, "--output", output]), 1);

    const report = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(report.assetsChecked, 2);
    assert.ok(
      report.errors.some((error) => error.includes(`Setup-${version}-arm64.exe`)),
      report.errors.join("\n"),
    );
    assert.deepEqual(report.komacUrls, []);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("passes every option through to the contract", () => {
    const dir = scratch();
    const output = path.join(dir, "winget-arch.json");
    const code = runCli([
      "--installers-regex", "^nope$",
      "--require-architectures", "x64",
      "--release-tag", "v9.9.9",
      "--output", output,
    ]);
    assert.equal(code, 1);
    const report = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(report.installersRegex, "^nope$");
    assert.deepEqual(report.requiredArchitectures, ["x64"]);
    assert.equal(report.releaseTag, "v9.9.9");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("local-only winget contract scripts", () => {
  it("removes GitHub Actions workflows while retaining local WinGet verification scripts", () => {
    assert.equal(fs.existsSync(path.join(__dirname, "..", ".github", "workflows")), false);
    assert.equal(pkg.scripts["verify:winget-arch"], "node scripts/verify-winget-arch-contract.js");
    assert.equal(
      pkg.scripts["verify:winget-manifest"],
      "node scripts/verify-winget-generated-manifest.js",
    );
  });
});
