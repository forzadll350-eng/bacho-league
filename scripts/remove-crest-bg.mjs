import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const dir = path.resolve('public/crests')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'))

function isBg(r, g, b) {
  const brightness = (r + g + b) / 3
  const chroma = Math.max(r, g, b) - Math.min(r, g, b)
  return brightness >= 155 && chroma <= 28
}

async function removeBg(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const px = new Uint8ClampedArray(data)
  const visited = new Uint8Array(w * h)
  const queue = []
  const idx = (x, y) => y * w + x

  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = idx(x, y)
    if (visited[i]) return
    const o = i * 4
    if (!isBg(px[o], px[o + 1], px[o + 2])) return
    visited[i] = 1
    queue.push(i)
  }

  for (let x = 0; x < w; x++) {
    pushIf(x, 0)
    pushIf(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    pushIf(0, y)
    pushIf(w - 1, y)
  }

  while (queue.length) {
    const i = queue.pop()
    px[i * 4 + 3] = 0
    const x = i % w
    const y = (i / w) | 0
    pushIf(x + 1, y)
    pushIf(x - 1, y)
    pushIf(x, y + 1)
    pushIf(x, y - 1)
  }

  // Morphological erode alpha (remove white fringe + soft shadow)
  for (let pass = 0; pass < 4; pass++) {
    const kill = []
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = idx(x, y)
        const o = i * 4
        if (px[o + 3] === 0) continue
        let touch = false
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (px[idx(x + dx, y + dy) * 4 + 3] === 0) {
            touch = true
            break
          }
        }
        if (!touch) continue
        const brightness = (px[o] + px[o + 1] + px[o + 2]) / 3
        const chroma = Math.max(px[o], px[o + 1], px[o + 2]) - Math.min(px[o], px[o + 1], px[o + 2])
        // Always nibble pale fringe; lightly nibble any edge on early passes
        if (brightness >= 120 && chroma <= 55) kill.push(i)
        else if (pass < 2 && brightness >= 90 && chroma <= 70) kill.push(i)
      }
    }
    for (const i of kill) px[i * 4 + 3] = 0
  }

  // Despill remaining edge: darken/fade pale rim
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(x, y)
      const o = i * 4
      if (px[o + 3] === 0) continue
      let touch = false
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (px[idx(x + dx, y + dy) * 4 + 3] === 0) {
          touch = true
          break
        }
      }
      if (!touch) continue
      const brightness = (px[o] + px[o + 1] + px[o + 2]) / 3
      if (brightness > 170) {
        px[o + 3] = Math.min(px[o + 3], 40)
      }
    }
  }

  await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath)

  console.log('ok', path.basename(outputPath), `${Math.round(fs.statSync(outputPath).size / 1024)}kb`)
}

async function main() {
  for (const file of files) {
    const base = file.replace(/\.jpg$/i, '')
    await removeBg(path.join(dir, file), path.join(dir, `${base}.png`))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
