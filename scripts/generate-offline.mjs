import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const entries = ["./", "./index.html"];
for (const file of await readdir("dist/assets"))
  entries.push(`./assets/${file}`);
for (const file of await readdir("dist/molecules"))
  if (file.endsWith(".sdf")) entries.push(`./molecules/${file}`);
const hash = createHash("sha256");
for (const file of entries.slice(1))
  hash.update(await readFile(`dist/${file.slice(2)}`));
const version = hash.digest("hex").slice(0, 16);
const sw = `// Generated from the exact production files. All essential assets are cached atomically.
const PREFIX='carbohydrate-explorer-'+new URL(self.registration.scope).pathname;
const CACHE=PREFIX+'-${version}';
const FILES=${JSON.stringify(entries)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const saved=await cache.match(event.request);if(saved)return saved;
  try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate'){const shell=await cache.match('./index.html');if(shell)return shell;}throw error;}
 }));
});
`;
await writeFile("dist/sw.js", sw);
console.log(`Offline cache: ${entries.length} resources, version ${version}`);
