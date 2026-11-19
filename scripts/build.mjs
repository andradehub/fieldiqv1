import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await cp(path.join(root,'fieldiqarchives','public'),path.join(root,'public'),{recursive:true});
await mkdir(path.join(root,'public','vendor'),{recursive:true});
await cp(path.join(root,'node_modules','chart.js','dist','chart.umd.js'),path.join(root,'public','vendor','chart.umd.js'));
console.log('Interface e Chart.js preparados em public/. A API precisa de DATABASE_URL na nuvem.');
