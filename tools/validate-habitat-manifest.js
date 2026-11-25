const fs = require('fs');
const path = require('path');

const manifestPath = path.join('assets', 'habitat', 'cozy-cottage', 'habitat-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('Manifest not found:', manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log('Manifest loaded successfully:', manifest.id);

const baseDir = path.dirname(manifestPath);

function checkFile(filePath, label) {
  const fullPath = path.join(baseDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`MISSING [${label}]: ${filePath} (resolved to ${fullPath})`);
    process.exit(1);
  } else {
    console.log(`FOUND [${label}]: ${filePath}`);
  }
}

// Check layers
checkFile(manifest.layers.shadow, 'shadow layer');
checkFile(manifest.layers.backdrop, 'backdrop layer');
checkFile(manifest.layers.cottageNight, 'cottageNight layer');
checkFile(manifest.layers.cottageAmber, 'cottageAmber layer');
checkFile(manifest.layers.foreground, 'foreground layer');

// Check door frames
Object.values(manifest.layers.door.frames).forEach(frame => {
  checkFile(frame, 'door frame');
});

// Check smoke frames
manifest.layers.smoke.frames.forEach(frame => {
  checkFile(frame, 'smoke frame');
});

// Check stations props
Object.values(manifest.stations).forEach(station => {
  checkFile(station.props.file, 'station props');
});

// Check actor clips
Object.entries(manifest.actors).forEach(([actorName, actorConfig]) => {
  Object.entries(actorConfig.clips).forEach(([clipName, clipValue]) => {
    if (actorConfig.kind === 'spritesheet-webp') {
      const sheetPath = path.join(baseDir, actorConfig.baseDir, clipValue.sheet);
      const metaPath = path.join(baseDir, actorConfig.baseDir, clipValue.meta);
      if (!fs.existsSync(sheetPath)) {
        console.error(`MISSING actor sheet [${actorName}.${clipName}]: ${clipValue.sheet}`);
        process.exit(1);
      }
      if (!fs.existsSync(metaPath)) {
        console.error(`MISSING actor meta [${actorName}.${clipName}]: ${clipValue.meta}`);
        process.exit(1);
      }
      console.log(`FOUND actor spritesheet/meta [${actorName}.${clipName}]`);
    } else {
      // svg or similar
      const clipPath = path.join(baseDir, actorConfig.baseDir, clipValue);
      checkFile(path.join(actorConfig.baseDir, clipValue), `actor clip ${actorName}.${clipName}`);
    }
  });
});

console.log('ALL MANIFEST ASSETS EXIST ON DISK SUCCESSFULLY!');
