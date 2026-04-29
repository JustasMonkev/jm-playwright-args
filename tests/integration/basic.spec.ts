import { cp, mkdir, mkdtemp, realpath, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

const packageRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

describe('basic example', () => {
  test('can be required from CommonJS after build', async () => {
    await execa('npm', ['run', 'build'], { cwd: packageRoot });

    const result = await execa('node', [
      '-e',
      `const api = require(${JSON.stringify(packageRoot)}); console.log(typeof api.pwArg.string);`,
    ]);

    expect(result.stdout).toBe('function');
  });

  test('passes custom tenant into Playwright config and test', async () => {
    await execa('npm', ['run', 'build'], { cwd: packageRoot });

    const projectDir = await createExampleProject();
    const result = await execa('node', [path.join(packageRoot, 'dist/cli.js'), '--tenant=acme', '--', 'test'], {
      cwd: projectDir,
      reject: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout + result.stderr).toContain('1 passed');
  }, 30000);

  test('defaults to playwright test in the built CLI', async () => {
    await execa('npm', ['run', 'build'], { cwd: packageRoot });

    const projectDir = await createExampleProject();
    const result = await execa('node', [path.join(packageRoot, 'dist/cli.js'), '--tenant=acme'], {
      cwd: projectDir,
      reject: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout + result.stderr).toContain('1 passed');
  }, 30000);
});

async function createExampleProject(): Promise<string> {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'playwright-args-basic-'));
  await cp(path.join(packageRoot, 'examples', 'basic'), projectDir, { recursive: true });

  const nodeModulesDir = path.join(projectDir, 'node_modules');
  const binDir = path.join(nodeModulesDir, '.bin');
  const scopeDir = path.join(nodeModulesDir, '@playwright');

  await mkdir(binDir, { recursive: true });
  await mkdir(scopeDir, { recursive: true });

  await symlink(await realpath(packageRoot), path.join(nodeModulesDir, 'jm-playwright-args'), 'dir');
  await symlink(
    await realpath(path.join(packageRoot, 'node_modules', '@playwright', 'test')),
    path.join(scopeDir, 'test'),
    'dir',
  );
  await symlink(
    await realpath(path.join(packageRoot, 'node_modules', 'playwright')),
    path.join(nodeModulesDir, 'playwright'),
    'dir',
  );
  await symlink(path.join(scopeDir, 'test', 'cli.js'), path.join(binDir, 'playwright'));

  return projectDir;
}
