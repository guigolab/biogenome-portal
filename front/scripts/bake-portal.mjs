/**
 * bake-portal.mjs
 *
 * Generates public/portal.json before `next build`, allowing each Docker
 * image to carry its own branded configuration instead of relying on a
 * runtime bind-mount.
 *
 * Resolution order (last one wins):
 *   1. lib/portal/defaultPortal.json  — committed defaults
 *   2. branding/portal.config.json    — optional, from private config repo / CI
 *   3. Scalar env overrides           — PORTAL_API_BASE, PORTAL_ROOT_TAXID,
 *                                       NEXT_PUBLIC_CMS (+ PORTAL_GOAT, PORTAL_MAP, PORTAL_INSDC_STATUS)
 *
 * Asset copying:
 *   Any file placed in branding/ with a recognised name is copied to public/:
 *     portal-logo.png, portal-logo.svg, portal-logo.webp, hero-map.geojson
 *
 * Usage:
 *   node scripts/bake-portal.mjs
 *   npm run bake-portal
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, readdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson(fp) {
  return JSON.parse(readFileSync(fp, 'utf-8'))
}

/**
 * Recursive merge: plain objects are merged, arrays and primitives overwrite.
 * This lets a partial preset override only what it specifies.
 */
function deepMerge(base, override) {
  const result = { ...base }
  for (const [key, val] of Object.entries(override)) {
    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof base[key] === 'object' &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], val)
    } else {
      result[key] = val
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// 1. Load defaults
// ---------------------------------------------------------------------------

const defaultsPath = resolve(root, 'lib/portal/defaultPortal.json')
if (!existsSync(defaultsPath)) {
  console.error(`[bake-portal] ERROR: defaults not found at ${defaultsPath}`)
  process.exit(1)
}
let config = readJson(defaultsPath)
console.log('[bake-portal] loaded defaults from lib/portal/defaultPortal.json')

// ---------------------------------------------------------------------------
// 2. Merge optional branding preset
// ---------------------------------------------------------------------------

const presetPath = resolve(root, 'branding/portal.config.json')
if (existsSync(presetPath)) {
  const preset = readJson(presetPath)
  config = deepMerge(config, preset)
  console.log('[bake-portal] merged branding/portal.config.json')
} else {
  console.log('[bake-portal] no branding/portal.config.json found — using defaults')
}

// ---------------------------------------------------------------------------
// 3. Scalar env overrides (only override when the var is non-empty)
// ---------------------------------------------------------------------------

function envStr(key) {
  const v = process.env[key]
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function envBool(key) {
  const v = process.env[key]
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

const apiBase = envStr('PORTAL_API_BASE')
const rootTaxid = envStr('PORTAL_ROOT_TAXID')
const cms = envBool('NEXT_PUBLIC_CMS')
const goat = envBool('PORTAL_GOAT')
const map = envBool('PORTAL_MAP')
const insdcStatus = envBool('PORTAL_INSDC_STATUS')

if (apiBase !== null) {
  config.general.apiBase = apiBase
  console.log(`[bake-portal] general.apiBase = ${apiBase}`)
}
if (rootTaxid !== null) {
  config.general.rootTaxid = rootTaxid
  console.log(`[bake-portal] general.rootTaxid = ${rootTaxid}`)
}
if (cms !== null) {
  config.general.cms = cms
  console.log(`[bake-portal] general.cms = ${cms}`)
}
if (goat !== null) {
  config.general.goat = goat
  console.log(`[bake-portal] general.goat = ${goat}`)
}
if (map !== null) {
  config.general.map = map
  console.log(`[bake-portal] general.map = ${map}`)
}
if (insdcStatus !== null) {
  config.general.insdcStatus = insdcStatus
  console.log(`[bake-portal] general.insdcStatus = ${insdcStatus}`)
}

// ---------------------------------------------------------------------------
// 4. Write public/portal.json
// ---------------------------------------------------------------------------

const publicDir = resolve(root, 'public')
mkdirSync(publicDir, { recursive: true })
const outPath = resolve(publicDir, 'portal.json')
writeFileSync(outPath, JSON.stringify(config, null, 2))
console.log(`[bake-portal] wrote ${outPath}`)

// ---------------------------------------------------------------------------
// 5. Copy all branding assets (non-config files) to public/
//    Copies every file in branding/ except portal.config.json, preserving
//    the original filename so logo URLs in the config stay valid.
// ---------------------------------------------------------------------------

const brandingDir = resolve(root, 'branding')
if (existsSync(brandingDir)) {
  for (const name of readdirSync(brandingDir)) {
    if (name === 'portal.config.json') continue
    const src = resolve(brandingDir, name)
    const dest = resolve(publicDir, name)
    copyFileSync(src, dest)
    console.log(`[bake-portal] copied branding/${name} → public/${name}`)
  }
}

console.log('[bake-portal] done.')
