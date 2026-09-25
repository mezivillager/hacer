import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Mission Control (#473): a second Vite root, served at <BASE_PATH>control/ beside the app and importing nothing from
// src/. `pnpm run build:control` first writes the snapshot to public/data/, from where the page fetches it.
export default defineConfig({
  root: __dirname,
  base: `${process.env.BASE_PATH ?? '/'}control/`,
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
