import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const ADMIN_ROOT = resolve(ROOT, 'admin')
const VERCEL_PROJECT_ID = 'prj_ptudbUPb8h8eEkOwBuQn7ssCWEDJ'
const VERCEL_ORG_ID = 'team_l7Fz9MhE86PTkNy7Z94eD2HV'
const VERCEL_PROJECT_NAME = 'bacho-league-admin'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function fail(message) {
  console.error(`\n[deploy:admin:prod] BLOCKED: ${message}`)
  process.exit(1)
}

function spawn(command, args, cwd, options) {
  if (process.platform === 'win32' && command.endsWith('.cmd')) {
    return spawnSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].join(' ')],
      { ...options, cwd },
    )
  }
  return spawnSync(command, args, { ...options, cwd })
}

function capture(command, args, cwd = ROOT) {
  const result = spawn(command, args, cwd, { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) {
    const details = `${result.stdout || ''}${result.stderr || ''}${result.error || ''}`.trim()
    fail(`${command} ${args.join(' ')} failed${details ? `\n${details}` : ''}`)
  }
  return `${result.stdout || ''}${result.stderr || ''}`.trim()
}

function run(command, args, cwd) {
  const result = spawn(command, args, cwd, { stdio: 'inherit', windowsHide: true })
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed`)
}

console.log('[deploy:admin:prod] Verifying release repository...')
if (capture('git', ['branch', '--show-current']) !== 'main') fail('expected branch main')
run('git', ['fetch', '--quiet', 'origin', 'main'], ROOT)
if (capture('git', ['status', '--porcelain'])) fail('working tree is not clean')
if (capture('git', ['rev-parse', 'HEAD']) !== capture('git', ['rev-parse', 'origin/main'])) {
  fail('local main is not synchronized with origin/main')
}

const packageJson = JSON.parse(readFileSync(resolve(ADMIN_ROOT, 'package.json'), 'utf8'))
if (packageJson.name !== VERCEL_PROJECT_NAME) fail('admin package marker does not match')
const project = JSON.parse(readFileSync(resolve(ADMIN_ROOT, '.vercel', 'project.json'), 'utf8'))
if (
  project.projectId !== VERCEL_PROJECT_ID ||
  project.orgId !== VERCEL_ORG_ID ||
  project.projectName !== VERCEL_PROJECT_NAME
) {
  fail('local Vercel link does not match the admin production project')
}

const inspection = capture(npxCommand, ['vercel', 'project', 'inspect', VERCEL_PROJECT_NAME], ADMIN_ROOT)
if (!inspection.includes(VERCEL_PROJECT_ID) || !inspection.includes('Name')) {
  fail('authenticated Vercel identity cannot verify the admin production project')
}

console.log('[deploy:admin:prod] Guard passed. Building admin bundle...')
run(npmCommand, ['run', 'build'], ADMIN_ROOT)
console.log('[deploy:admin:prod] Deploying verified main to admin production...')
run(npxCommand, ['vercel', 'deploy', '--prod', '--yes'], ADMIN_ROOT)
console.log('[deploy:admin:prod] Production deployment completed.')
