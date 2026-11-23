import { createDatabase } from './db.mjs';
import { createApp } from './app.mjs';
const db = await createDatabase();
const app = createApp(db);
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 4173);
const server = app.listen(port,host,() => console.log('FieldIQ disponível em http://' + host + ':' + port + '\nBanco: ' + db.kind));
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  server.close(async () => { await db.close(); process.exit(0); });
}
process.on('SIGINT',close);
process.on('SIGTERM',close);
