/**
 * Cloudflare Pages deployment using proper Direct Upload API
 * Uses hash-based manifest as required by the API
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, 'dist')

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const ACCOUNT_ID = 'dfa0b92a727770d6700310ead6fb3cee'
const PROJECT_NAME = process.env.PAGES_PROJECT || 'neoa-app'

if (!API_TOKEN) {
  console.error('❌ Set CLOUDFLARE_API_TOKEN env var')
  process.exit(1)
}

function collectFiles(dir, base = '') {
  const entries = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      entries.push(...collectFiles(path.join(dir, entry.name), rel))
    } else {
      const fullPath = path.join(dir, entry.name)
      const content = fs.readFileSync(fullPath)
      const hash = crypto.createHash('sha256').update(content).digest('hex')
      entries.push({ 
        path: `/${rel}`, 
        fullPath,
        content,
        hash,
        size: content.length
      })
    }
  }
  return entries
}

async function deploy() {
  const files = collectFiles(DIST_DIR)
  console.log(`📦 Found ${files.length} files to deploy to ${PROJECT_NAME}`)

  // Build manifest: path → content hash
  const manifest = {}
  for (const file of files) {
    manifest[file.path] = file.hash
  }

  // Create multipart form with manifest + all file blobs keyed by hash
  const formData = new FormData()
  formData.append('manifest', JSON.stringify(manifest))

  // Add files keyed by their hash (this is what Pages expects)
  const addedHashes = new Set()
  for (const file of files) {
    if (!addedHashes.has(file.hash)) {
      formData.append(file.hash, new Blob([file.content]), file.path)
      addedHashes.add(file.hash)
    }
  }

  console.log(`🚀 Uploading ${addedHashes.size} unique files to Cloudflare Pages...`)
  
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_TOKEN}` },
      body: formData,
    }
  )

  const data = await res.json()
  
  if (data.success) {
    console.log('✅ Deployment successful!')
    console.log(`🌐 URL: ${data.result.url}`)
    console.log(`🔗 Production: https://${PROJECT_NAME}.pages.dev`)
    console.log(`📋 Deployment ID: ${data.result.id}`)
  } else {
    console.error('❌ Deployment failed:')
    console.error(JSON.stringify(data.errors, null, 2))
    process.exit(1)
  }
}

deploy().catch(err => {
  console.error('❌ Fatal error:', err.message)
  process.exit(1)
})
