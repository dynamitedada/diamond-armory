// Dev server used only for promo capture: no HMR / file watching, so edits elsewhere
// in the repo can never reload the page mid-take.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: new URL('../..', import.meta.url).pathname,
  plugins: [react()],
  server: { hmr: false, watch: null },
})
