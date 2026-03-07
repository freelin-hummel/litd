import fs from 'node:fs';
import path from 'node:path';
import { SQLite } from '@hocuspocus/extension-sqlite';
import { Server } from '@hocuspocus/server';

const host = process.env.HOCUSPOCUS_HOST?.trim() || '127.0.0.1';
const port = Number.parseInt(process.env.HOCUSPOCUS_PORT || '1234', 10);
const authToken = process.env.HOCUSPOCUS_TOKEN?.trim() || null;
const dataDir = path.resolve('.data');
const databasePath = process.env.HOCUSPOCUS_DB_PATH?.trim() || path.join(dataDir, 'hocuspocus.sqlite');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const server = new Server({
  host,
  port,
  extensions: [
    new SQLite({
      database: databasePath,
    }),
  ],
  async onAuthenticate({ token }) {
    if (!authToken) {
      return;
    }

    if (token !== authToken) {
      throw new Error('Unauthorized');
    }
  },
  async onConnect({ documentName }) {
    console.log(`[hocuspocus] connected: ${documentName}`);
  },
  async onDisconnect({ documentName }) {
    console.log(`[hocuspocus] disconnected: ${documentName}`);
  },
});

server.listen();

console.log(`[hocuspocus] listening on ws://${host}:${port}`);
console.log(`[hocuspocus] sqlite: ${databasePath}`);