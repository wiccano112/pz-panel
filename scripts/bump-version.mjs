import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const versionJsonPath = path.join(rootDir, 'src', 'version.json');

const bumpType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(bumpType) && !/^\d+\.\d+\.\d+/.test(bumpType)) {
  console.error('Usage: node scripts/bump-version.mjs [patch|minor|major|<explicit-version>]');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let versionJson = {};
try {
  versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
} catch {
  versionJson = {
    version: packageJson.version || '1.0.0',
    releaseDate: new Date().toISOString().split('T')[0],
    buildNumber: `${new Date().toISOString().split('T')[0].replace(/-/g, '')}.1`,
    channel: 'stable',
    repoUrl: 'https://github.com/wiccano112/pz-panel',
  };
}

const currentVersion = packageJson.version || versionJson.version || '1.0.0';
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newVersion;
if (bumpType === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (bumpType === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else {
  newVersion = bumpType.replace(/^v/, '');
}

const todayStr = new Date().toISOString().split('T')[0];
const todayCompact = todayStr.replace(/-/g, '');

let buildSeq = 1;
if (versionJson.buildNumber && versionJson.buildNumber.startsWith(todayCompact)) {
  const parts = versionJson.buildNumber.split('.');
  if (parts.length > 1 && !isNaN(Number(parts[1]))) {
    buildSeq = Number(parts[1]) + 1;
  }
}

packageJson.version = newVersion;
versionJson = {
  version: newVersion,
  releaseDate: todayStr,
  buildNumber: `${todayCompact}.${buildSeq}`,
  channel: versionJson.channel || 'stable',
  repoUrl: versionJson.repoUrl || 'https://github.com/wiccano112/pz-panel',
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n', 'utf8');

console.log(`Successfully bumped version from v${currentVersion} to v${newVersion}`);
console.log(`- package.json: ${newVersion}`);
console.log(`- src/version.json: ${newVersion} (Build: ${versionJson.buildNumber}, Date: ${todayStr})`);
