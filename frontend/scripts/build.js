const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isoBuildTime() {
  return new Date().toISOString();
}

function main() {
  const root = path.resolve(__dirname, '..');
  const pkgPath = path.join(root, 'package.json');
  const pkg = readJson(pkgPath);

  const env = {
    ...process.env,
    REACT_APP_VERSION: `v${pkg.version}`,
    REACT_APP_BUILD_TIME: isoBuildTime(),
  };

  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  const result = spawnSync(cmd, ['react-scripts', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env,
  });

  process.exit(result.status ?? 1);
}

main();
