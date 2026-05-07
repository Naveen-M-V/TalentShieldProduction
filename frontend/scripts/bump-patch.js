const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function bumpPatch(version) {
  const parts = String(version).trim().split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid semver version: ${version}. Expected MAJOR.MINOR.PATCH`);
  }

  const [major, minor, patch] = parts.map((p) => {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid semver number: ${p}`);
    return n;
  });

  return `${major}.${minor}.${patch + 1}`;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const pkgPath = path.join(root, 'package.json');
  const lockPath = path.join(root, 'package-lock.json');

  const pkg = readJson(pkgPath);
  const current = pkg.version;
  const next = bumpPatch(current);

  pkg.version = next;
  writeJson(pkgPath, pkg);

  if (fs.existsSync(lockPath)) {
    const lock = readJson(lockPath);
    lock.version = next;

    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = next;
    }

    writeJson(lockPath, lock);
  }

  process.stdout.write(next);
}

main();
