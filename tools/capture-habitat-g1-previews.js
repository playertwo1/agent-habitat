const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

async function main() {
  const outputDir = path.resolve(__dirname, '../dist/g1-previews');
  console.log(`Starting habitat preview capture to ${outputDir}...`);

  const launchJsPath = path.resolve(__dirname, '../launch.js');
  const child = spawn(process.execPath, [launchJsPath, '--habitat-capture-previews=dist/g1-previews'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  const timeout = setTimeout(() => {
    console.error('Capture process timed out after 60 seconds!');
    child.kill('SIGKILL');
    process.exit(1);
  }, 60000);

  child.on('exit', (code) => {
    clearTimeout(timeout);
    console.log(`Capture process exited with code ${code}`);

    const expectedFiles = [
      'combo-000-dark.png',
      'combo-100-dark.png',
      'combo-010-dark.png',
      'combo-001-dark.png',
      'combo-110-dark.png',
      'combo-101-dark.png',
      'combo-011-dark.png',
      'combo-111-dark.png',
      'combo-000-light.png',
      'combo-111-light.png',
      'door-opening-100-dark.png'
    ];

    let missing = 0;
    for (const f of expectedFiles) {
      const full = path.join(outputDir, f);
      if (!fs.existsSync(full)) {
        console.error(`Missing expected preview file: ${full}`);
        missing++;
      } else {
        const stats = fs.statSync(full);
        if (stats.size === 0) {
          console.error(`Preview file is empty (0 bytes): ${full}`);
          missing++;
        } else {
          console.log(`Validated preview: ${f} (${stats.size} bytes)`);
        }
      }
    }

    if (missing > 0) {
      console.error(`Capture validation failed with ${missing} missing/empty files`);
      process.exit(1);
    } else {
      console.log('All 11 habitat G1 previews validated successfully!');
      process.exit(0);
    }
  });
}

main();
