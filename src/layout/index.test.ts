import { describe, expect, it } from 'vitest'
import * as layout from '@/layout'

const SOURCES = Object.entries(
  import.meta.glob<string>('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
).filter(([file]) => file !== './index.test.ts')

const SPECIFIER = /(?:\bfrom\s*|^\s*import\s*|\bimport\(\s*)['"]([^'"]+)['"]/gm
const RENDERING = /^(react|react-dom|three|three-stdlib)(\/|$)|^@react-(three|spring)\//

function renderingImports(source: string): string[] {
  return [...source.matchAll(SPECIFIER)].map((match) => match[1]).filter((specifier) => RENDERING.test(specifier))
}

describe('src/layout', () => {
  it('holds the chip, bus and node layout modules', () => {
    expect(SOURCES.map(([file]) => file)).toEqual(
      expect.arrayContaining(['./chipBodyLayout.ts', './busBodyLayout.ts', './nodeConfig.ts']),
    )
  })

  it('finds React and Three in every import form', () => {
    const sample = [
      "import { a } from 'three'",
      "import type {\n  B,\n} from '@react-three/fiber'",
      "export * from 'react'",
      "import 'three-stdlib'",
      "const c = await import('react-dom')",
      "import { colors } from '@/theme'",
      "import { d } from 'reactive'",
    ].join('\n')
    expect(renderingImports(sample)).toEqual(['three', '@react-three/fiber', 'react', 'three-stdlib', 'react-dom'])
  })

  it('imports nothing from React or Three', () => {
    const offenders = SOURCES.flatMap(([file, source]) =>
      renderingImports(source).map((specifier) => `${file} -> ${specifier}`),
    )
    expect(offenders).toEqual([])
  })

  it('exports the chip, bus and node layout surface', () => {
    expect(Object.keys(layout)).toEqual(
      expect.arrayContaining([
        'computeChipLayout',
        'computeBusPinLayout',
        'computeBusBodyDimensions',
        'NODE_DIMENSIONS',
        'NODE_COLORS',
        'INPUT_NODE_CONFIG',
        'OUTPUT_NODE_CONFIG',
        'CONSTANT_NODE_CONFIG',
        'JUNCTION_CONFIG',
        'calculateNodePinPosition',
      ]),
    )
  })
})
