import { defineConfig } from 'vite';

const mentorOrigin = process.env.GRAVEYARD_MENTOR_ORIGIN;
export default defineConfig({
  base: './',
  server: {
    proxy: mentorOrigin ? { '/api/mentor': mentorOrigin } : undefined,
  },
  build: { target: 'es2022' },
});
