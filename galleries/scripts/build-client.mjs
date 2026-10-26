import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import {writeFileSync,copyFileSync} from 'node:fs';
const out=resolve('../website/public/client-gallery');
await build({configFile:false,publicDir:false,define:{'process.env.NODE_ENV':JSON.stringify('production')},plugins:[react()],base:'/client-gallery/',build:{outDir:out,emptyOutDir:true,minify:true,lib:{entry:resolve('client/entry.tsx'),formats:['es'],fileName:'app',cssFileName:'style'},rollupOptions:{output:{entryFileNames:'app.js'}}}});
copyFileSync('public/favicon.svg',out+'/favicon.svg');
writeFileSync(out+'/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>Studio Galleries</title><link rel="icon" href="/client-gallery/favicon.svg"><link rel="stylesheet" href="/client-gallery/style.css"></head><body><div id="root"></div><script type="module" src="/client-gallery/app.js"></script></body></html>');
