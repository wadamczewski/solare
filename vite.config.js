import {resolve} from 'node:path';
import {defineConfig} from 'vite';

// Two pages share one app: index.html is the redesigned interface
// (src/ux/), which loads main.js and regroups its controls, and
// classic.html the original interface, kept as a fallback. Vite serves both in development on its own; the production build
// needs both listed so dist/ contains each.
export default defineConfig({
 build:{rollupOptions:{input:{main:resolve(import.meta.dirname,'index.html'),classic:resolve(import.meta.dirname,'classic.html')}}}
});
