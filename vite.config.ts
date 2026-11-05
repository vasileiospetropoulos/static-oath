import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const publicDirectory = resolve(projectRoot, 'public')

function listPublicAssets(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      return listPublicAssets(absolutePath)
    }

    return [
      `./${relative(publicDirectory, absolutePath).replaceAll('\\', '/')}`,
    ]
  })
}

function offlineShellPlugin(): Plugin {
  return {
    name: 'static-oath-offline-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      const bundleEntries = Object.entries(bundle).sort(([left], [right]) =>
        left.localeCompare(right),
      )
      const bundledAssets = bundleEntries.map(([fileName]) => `./${fileName}`)
      const publicAssets = listPublicAssets(publicDirectory)
      const cacheDigest = createHash('sha256')

      for (const [fileName, output] of bundleEntries) {
        cacheDigest.update(fileName)
        cacheDigest.update(
          output.type === 'chunk'
            ? output.code
            : typeof output.source === 'string'
              ? output.source
              : output.source,
        )
      }

      for (const publicAsset of publicAssets) {
        cacheDigest.update(publicAsset)
        cacheDigest.update(
          readFileSync(resolve(publicDirectory, publicAsset.slice(2))),
        )
      }

      const cacheName = `static-oath-shell-${cacheDigest.digest('hex').slice(0, 12)}`
      const workerSource = readFileSync(
        resolve(projectRoot, 'scripts/service-worker.js'),
        'utf8',
      )
        .replace(
          "'__PRECACHE_URLS__'",
          JSON.stringify(['./', ...bundledAssets, ...publicAssets]),
        )
        .replace("'__CACHE_NAME__'", JSON.stringify(cacheName))

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: workerSource,
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), offlineShellPlugin()],
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
