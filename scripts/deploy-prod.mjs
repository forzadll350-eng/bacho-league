import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const VERCEL_PROJECT_ID = 'prj_ablMCJ85PSfS7Xt000OAZXucMdkm'
const VERCEL_ORG_ID = 'team_l7Fz9MhE86PTkNy7Z94eD2HV'
const VERCEL_PROJECT_NAME = 'bacho-league'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function fail(message) {
  console.error(`\n[deploy:prod] BLOCKED: ${message}`)
  process.exit(1)
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    const details = `${result.stdout || ''}${result.stderr || ''}`.trim()
    fail(`${command} ${args.join(' ')} failed${details ? `\n${details}` : ''}`)
  }
  return `${result.stdout || ''}${result.stderr || ''}`.trim()
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
  })
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed`)
}

console.log('[deploy:prod] Verifying release repository...')

const branch = capture('git', ['branch', '--show-current'])
if (branch !== 'main') fail(`expected branch main, found ${branch || '(detached HEAD)'}`)

run('git', ['fetch', '--quiet', 'origin', 'main'])

const dirty = capture('git', ['status', '--porcelain'])
if (dirty) fail('working tree is not clean')

const head = capture('git', ['rev-parse', 'HEAD'])
const originMain = capture('git', ['rev-parse', 'origin/main'])
if (head !== originMain) fail('local main is not synchronized with origin/main')

const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
if (packageJson.name !== VERCEL_PROJECT_NAME) fail('package marker does not match bacho-league')

const project = JSON.parse(readFileSync(resolve(ROOT, '.vercel', 'project.json'), 'utf8'))
if (
  project.projectId !== VERCEL_PROJECT_ID ||
  project.orgId !== VERCEL_ORG_ID ||
  project.projectName !== VERCEL_PROJECT_NAME
) {
  fail('local Vercel link does not match the bacho-league production project')
}

const indexHtml = readFileSync(resolve(ROOT, 'index.html'), 'utf8')
const teamsSource = readFileSync(resolve(ROOT, 'src', 'data', 'teams.ts'), 'utf8')
const webhookSource = readFileSync(resolve(ROOT, 'src', 'lib', 'googleSheetsWebhook.ts'), 'utf8')
if (!indexHtml.includes('bacho-league-theme')) fail('missing public-app production marker')
if (!teamsSource.includes("id: 'bacho-league'")) fail('missing league data marker')
if (!webhookSource.includes('VITE_GOOGLE_SHEETS_WEBHOOK_URL')) fail('missing Sheets webhook marker')

const projectInspection = capture(npxCommand, [
  'vercel',
  'project',
  'inspect',
  VERCEL_PROJECT_NAME,
])
if (!projectInspection.includes(VERCEL_PROJECT_ID) || !projectInspection.includes('Name')) {
  fail('authenticated Vercel identity cannot verify the linked production project')
}

console.log('[deploy:prod] Guard passed. Building production bundle...')
run(npmCommand, ['run', 'build'])

console.log('[deploy:prod] Deploying verified main to Vercel production...')
run(npxCommand, ['vercel', 'deploy', '--prod', '--yes'])

console.log('[deploy:prod] Production deployment completed.')
