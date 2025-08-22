import { defineConfig } from 'vite'

export default defineConfig({
    base: '/hurricane/', // GitHub Pages base path
    build: {
        outDir: 'dist', // standard Vite output directory
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    },
    server: {
        port: 3000
    }
})
