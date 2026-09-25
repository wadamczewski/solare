import {resolve} from 'node:path';
import {defineConfig} from 'vite';

// Two pages share one app: index.html is the classic interface, ux.html the
// redesigned one (src/ux/), which loads the same main.js and regroups its
// controls. Vite serves both in development on its own; the production build
// needs both listed so dist/ contains each.
export default defineConfig({
 build:{rollupOptions:{input:{main:resolve(import.meta.dirname,'index.html'),ux:resolve(import.meta.dirname,'ux.html')}}}
});
