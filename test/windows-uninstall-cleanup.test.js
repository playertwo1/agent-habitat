const assert = require("node:assert");
const { describe, it } = require("node:test");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const pkg = require("../package.json");

const ROOT = path.join(__dirname, "..");
const NSIS_INCLUDE = path.join(ROOT, "build", "installer.nsh");
const CLEANUP_SCRIPT = path.join(ROOT, "build", "uninstall-claude-hooks.ps1");

// Hooks do clawd-on-desk que convivem no mesmo settings.json e nunca podem ser removidos pelo Agent Habitat.
const CLAWD_STOP = '& "node" "C:\\Clawd\\hooks\\clawd-hook.js" Stop';
const CLAWD_AUTO_START = '& "node" "C:\\Clawd\\hooks\\auto-start.js"';
const CLAWD_PERMISSION = { type: "http", url: "http://127.0.0.1:23333/permission", timeout: 600 };
const HABITAT_STOP = '& "node" "C:\\Agent Habitat\\resources\\app.asar.unpacked\\hooks\\agent-habitat-hook.js" claude Stop';

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeUtf8Bom(filePath, text) {
  fs.writeFileSync(filePath, Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(text, "utf8"),
  ]));
}

function writeUtf16LeBom(filePath, text) {
  fs.writeFileSync(filePath, Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(text, "utf16le"),
  ]));
}

function makeFixture(settingsText, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-uninstall-"));
  const home = path.join(root, "User With Space 中文");
  const claudeDir = path.join(home, ".claude");
  const installDir = path.join(root, "Agent Habitat Install Dir");
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.mkdirSync(installDir, { recursive: true });

  const markerPath = path.join(installDir, ".clawd-install-user-home");
  if (options.markerEncoding === "utf16le-bom") {
    writeUtf16LeBom(markerPath, home);
  } else {
    fs.writeFileSync(markerPath, home, "utf8");
  }

  const settingsPath = path.join(claudeDir, "settings.json");
  if (settingsText !== undefined) {
    if (options.settingsEncoding === "utf8-bom") {
      writeUtf8Bom(settingsPath, settingsText);
    } else {
      fs.writeFileSync(settingsPath, settingsText, "utf8");
    }
  }

  return {
    root,
    home,
    claudeDir,
    installDir,
    settingsPath,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function runCleanup(fixture) {
  const result = childProcess.spawnSync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    CLEANUP_SCRIPT,
    "-InstallDir",
    fixture.installDir,
  ], { encoding: "utf8" });

  assert.strictEqual(
    result.status,
    0,
    `cleanup failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertNoUtf8Bom(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.notDeepStrictEqual(
    Array.from(buffer.subarray(0, 3)),
    [0xef, 0xbb, 0xbf],
    `${filePath} should be UTF-8 without BOM`
  );
}

describe("Windows NSIS Claude hook uninstall cleanup", () => {
  it("wires the NSIS include and cleanup script into package config", () => {
    assert.strictEqual(pkg.build.nsis && pkg.build.nsis.include, "build/installer.nsh");
    assert.ok(fs.existsSync(NSIS_INCLUDE), "build/installer.nsh should exist");
    assert.ok(fs.existsSync(CLEANUP_SCRIPT), "build/uninstall-claude-hooks.ps1 should exist");

    const nsis = readText(NSIS_INCLUDE);
    assert.match(nsis, /!macro customInstall/);
    assert.match(nsis, /!macro customUnInstall/);
    assert.match(nsis, /File "\/oname=\$INSTDIR\\uninstall-claude-hooks\.ps1"/);
    assert.match(nsis, /FileWrite \$0 "\$PROFILE"/);
    assert.match(nsis, /FileRead \$0 \$1/);
    // O cleaner herdado limpa hooks do clawd-on-desk em todos os agentes; o Habitat nunca pode chamá-lo.
    assert.doesNotMatch(nsis, /cleanup-integrations\.js|Clawd on Desk/);
    assert.match(nsis, /nsExec::ExecToLog 'powershell\.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "\$INSTDIR\\uninstall-claude-hooks\.ps1" -InstallDir "\$INSTDIR"'/);
  });

  it("issue #1293: skips the hook cleanup during NSIS upgrades", () => {
    const nsis = readText(NSIS_INCLUDE).replace(/\r\n/g, "\n");
    const uninstall = nsis.match(/!macro customUnInstall\n([\s\S]*?)!macroend/);
    assert.ok(uninstall, "customUnInstall should exist");

    const guarded = uninstall[1].match(/\$\{ifNot\} \$\{isUpdated\}\n([\s\S]*?)\n\s*\$\{endIf\}/);
    assert.ok(guarded, "customUnInstall should guard cleanup with ${ifNot} ${isUpdated}");
    assert.match(guarded[1], /FileRead \$0 \$1/);
    assert.match(guarded[1], /nsExec::ExecToLog 'powershell\.exe [^\n]*uninstall-claude-hooks\.ps1/);
  });

  it("targets only the Agent Habitat marker and never clawd-on-desk hooks or permission URLs", () => {
    const script = readText(CLEANUP_SCRIPT);
    const match = script.match(/\$ClawdCommandMarkers\s*=\s*@\(([^)]*)\)/);
    assert.ok(match, "PowerShell script should use an explicit @(...) marker literal");
    assert.deepStrictEqual(match[1].split(",").map((value) => value.trim()), ['"agent-habitat-hook.js"']);
    assert.doesNotMatch(script, /PermissionPorts|\/permission/);
  });

  it("contains PowerShell 5.1 JSON hardening requirements", () => {
    const script = readText(CLEANUP_SCRIPT);
    assert.match(script, /New-Object System\.Text\.UTF8Encoding -ArgumentList \$false/);
    assert.match(script, /\.TrimStart\(\[char\]0xFEFF\)\.Trim\(\)/);
    assert.match(script, /\$rawSettings = \$rawSettings\.TrimStart\(\[char\]0xFEFF\)/);
    assert.match(script, /\[System\.IO\.File\]::ReadAllText\(\$settingsPath, \$Utf8NoBom\)/);
    assert.match(script, /\[System\.IO\.File\]::WriteAllText\(\$settingsPath, \$json \+ \[Environment\]::NewLine, \$Utf8NoBom\)/);
    assert.match(script, /ConvertTo-Json -InputObject \$settings -Depth 100/);
    assert.match(script, /\.PSObject\.Properties/);
    assert.match(script, /\[object\[\]\]\$nextEntries\.ToArray\(\)/);
  });

  it("issue #1293: fallback cleanup checks exec args[0] before legacy command markers", () => {
    const script = readText(CLEANUP_SCRIPT);
    const helper = script.slice(script.indexOf("function Test-ClawdCommandHook"), script.indexOf("function Remove-ClawdHooksFromEntries"));
    assert.match(helper, /Get-JsonProperty \$Hook "args"/);
    assert.match(helper, /\$argsProperty\.Value -is \[System\.Array\]/);
    assert.match(helper, /\$argsProperty\.Value\[0\]/);
    assert.match(helper, /\$ClawdCommandMarkers -ccontains \$scriptName/);
    assert.match(script, /Test-ClawdCommandHook \$entry/);
    assert.match(script, /Test-ClawdCommandHook \$hook/);
  });

  it("removes Habitat exec hooks, preserving clawd-on-desk exec hooks and foreign args and basenames", {
    skip: process.platform !== "win32" ? "requires Windows PowerShell" : false,
  }, () => {
    const command = "C:\\Program Files\\nodejs\\node.exe";
    const exec = (script, ...args) => ({ type: "command", command, args: [script, ...args] });
    const kept = [exec("C:/Clawd/clawd-hook.js", "Stop"), exec("C:/Clawd/auto-start.js"),
      exec("C:/foreign.js", "agent-habitat-hook.js"), exec("C:/agent-habitat-hook.js.bak")];
    const fixture = makeFixture(JSON.stringify({ hooks: {
      Stop: [exec("C:/Habitat/agent-habitat-hook.js", "claude", "Stop"),
        { hooks: [exec("C:\\Habitat\\agent-habitat-hook.js", "claude", "Stop"), ...kept] }],
      SessionStart: [{ hooks: [exec("C:/Habitat/agent-habitat-hook.js", "claude", "SessionStart")] }],
    } }));
    try {
      runCleanup(fixture);
      assert.deepStrictEqual(readJson(fixture.settingsPath).hooks, { Stop: [{ hooks: kept }] });
      const backups = fs.readdirSync(fixture.claudeDir).filter((name) => name.endsWith(".bak"));
      runCleanup(fixture);
      assert.deepStrictEqual(fs.readdirSync(fixture.claudeDir).filter((name) => name.endsWith(".bak")), backups);
    } finally {
      fixture.cleanup();
    }
  });

  it("removes only Habitat hooks while preserving clawd-on-desk, third-party hooks and array shape", {
    skip: process.platform !== "win32" ? "requires Windows PowerShell" : false,
  }, () => {
    const fixture = makeFixture(JSON.stringify({
      metadata: { note: "non-ascii 中文 path" },
      hooks: {
        SessionStart: [
          { matcher: "", hooks: [{ type: "command", command: CLAWD_AUTO_START }] },
          { matcher: "", hooks: [{ type: "command", command: 'node "C:\\third-party.js" SessionStart' }] },
        ],
        Stop: [
          { matcher: "", hooks: [{ type: "command", command: HABITAT_STOP }] },
        ],
        PreToolUse: [
          {
            matcher: "",
            hooks: [
              { type: "command", command: 'node "C:\\third-party.js" PreToolUse' },
              { type: "command", command: HABITAT_STOP.replace("Stop", "PreToolUse") },
              { type: "command", command: CLAWD_STOP.replace("Stop", "PreToolUse") },
            ],
          },
        ],
        PermissionRequest: [
          { matcher: "", hooks: [CLAWD_PERMISSION, { type: "http", url: "http://127.0.0.1:8080/permission", timeout: 100 }] },
        ],
      },
    }, null, 2));

    try {
      runCleanup(fixture);
      const settings = readJson(fixture.settingsPath);

      assert.strictEqual(settings.metadata.note, "non-ascii 中文 path");
      assert.ok(!Object.prototype.hasOwnProperty.call(settings.hooks, "Stop"));
      assert.deepStrictEqual(
        settings.hooks.SessionStart.map((entry) => entry.hooks[0].command),
        [CLAWD_AUTO_START, 'node "C:\\third-party.js" SessionStart']
      );
      assert.deepStrictEqual(
        settings.hooks.PreToolUse[0].hooks.map((hook) => hook.command),
        ['node "C:\\third-party.js" PreToolUse', CLAWD_STOP.replace("Stop", "PreToolUse")]
      );
      assert.deepStrictEqual(
        settings.hooks.PermissionRequest[0].hooks.map((hook) => hook.url),
        [CLAWD_PERMISSION.url, "http://127.0.0.1:8080/permission"]
      );

      const backups = fs.readdirSync(fixture.claudeDir).filter((name) => /^settings\.json\.agent-habitat-uninstall-.*\.bak$/.test(name));
      assert.strictEqual(backups.length, 1);
      assertNoUtf8Bom(fixture.settingsPath);
    } finally {
      fixture.cleanup();
    }
  });

  it("leaves a settings.json with only clawd-on-desk hooks byte-for-byte untouched", {
    skip: process.platform !== "win32" ? "requires Windows PowerShell" : false,
  }, () => {
    const clawdOnly = JSON.stringify({
      hooks: {
        Stop: [{ matcher: "", hooks: [{ type: "command", command: CLAWD_STOP }] }],
        PermissionRequest: [{ matcher: "", hooks: [CLAWD_PERMISSION] }],
      },
    }, null, 2);
    const fixture = makeFixture(clawdOnly);

    try {
      runCleanup(fixture);
      assert.strictEqual(fs.readFileSync(fixture.settingsPath, "utf8"), clawdOnly);
      assert.deepStrictEqual(fs.readdirSync(fixture.claudeDir), ["settings.json"]);
    } finally {
      fixture.cleanup();
    }
  });

  it("reads an NSIS-style UTF-16LE BOM user-home marker", {
    skip: process.platform !== "win32" ? "requires Windows PowerShell" : false,
  }, () => {
    const fixture = makeFixture(JSON.stringify({
      hooks: {
        Stop: [{ matcher: "", hooks: [{ type: "command", command: HABITAT_STOP }] }],
      },
    }, null, 2), { markerEncoding: "utf16le-bom" });

    try {
      runCleanup(fixture);
      const settings = readJson(fixture.settingsPath);
      assert.deepStrictEqual(settings.hooks, {});
    } finally {
      fixture.cleanup();
    }
  });

  it("cleans a UTF-8 BOM settings.json and rewrites it without BOM", {
    skip: process.platform !== "win32" ? "requires Windows PowerShell" : false,
  }, () => {
    const fixture = makeFixture(JSON.stringify({
      hooks: {
        Stop: [{ matcher: "", hooks: [{ type: "command", command: HABITAT_STOP }, { type: "command", command: CLAWD_STOP }] }],
      },
    }, null, 2), { settingsEncoding: "utf8-bom" });

    try {
      runCleanup(fixture);
      const settings = readJson(fixture.settingsPath);
      assert.deepStrictEqual(settings.hooks.Stop[0].hooks.map((hook) => hook.command), [CLAWD_STOP]);
      assertNoUtf8Bom(fixture.settingsPath);
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps command marker matching case-sensitive to match JS cleanup semantics", {
    skip: process.platform !== "win32" ? "requires Windows PowerShell" : false,
  }, () => {
    const fixture = makeFixture(JSON.stringify({
      hooks: {
        Stop: [
          {
            matcher: "",
            hooks: [{ type: "command", command: '& "node" "C:\\User\\Agent-Habitat-Hook.js" Stop' }],
          },
        ],
      },
    }, null, 2));

    try {
      runCleanup(fixture);
      const settings = readJson(fixture.settingsPath);
      assert.strictEqual(settings.hooks.Stop[0].hooks[0].command, '& "node" "C:\\User\\Agent-Habitat-Hook.js" Stop');
    } finally {
      fixture.cleanup();
    }
  });

  it("leaves malformed settings untouched", {
    skip: process.platform !== "win32" ? "requires Windows PowerShell" : false,
  }, () => {
    const malformed = "{ not valid json\n";
    const fixture = makeFixture(malformed);

    try {
      runCleanup(fixture);
      assert.strictEqual(fs.readFileSync(fixture.settingsPath, "utf8"), malformed);
      const backups = fs.readdirSync(fixture.claudeDir).filter((name) => name.includes("agent-habitat-uninstall"));
      assert.deepStrictEqual(backups, []);
    } finally {
      fixture.cleanup();
    }
  });

  it("treats missing settings.json as a silent no-op", {
    skip: process.platform !== "win32" ? "requires Windows PowerShell" : false,
  }, () => {
    const fixture = makeFixture(undefined);

    try {
      runCleanup(fixture);
      assert.strictEqual(fs.existsSync(fixture.settingsPath), false);
      const files = fs.readdirSync(fixture.claudeDir);
      assert.deepStrictEqual(files, []);
    } finally {
      fixture.cleanup();
    }
  });
});
