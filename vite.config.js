import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        'group-progress': 'group-progress.html',
        profile: 'profile.html'
      }
    }
  }
}) 