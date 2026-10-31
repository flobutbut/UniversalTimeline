/**
 * PM2 : API + Vite indépendants du shell (Cursor / agent).
 * `yarn daemon:up` — les apps restent sous le démon PM2 (~/.pm2).
 */
const path = require('path');

const root = __dirname;
const serverRoot = path.join(root, 'server');

module.exports = {
  apps: [
    {
      name: 'chronologie-api',
      cwd: serverRoot,
      script: process.execPath,
      args: '--import tsx src/index.ts',
      interpreter: 'none',
      watch: ['src'],
      ignore_watch: ['node_modules', 'dist'],
      watch_delay: 1000,
      autorestart: true,
      max_restarts: 30,
      min_uptime: '4s',
      kill_timeout: 12000,
    },
    {
      name: 'chronologie-ui',
      cwd: root,
      script: path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
      interpreter: process.execPath,
      autorestart: true,
      max_restarts: 30,
      min_uptime: '4s',
    },
  ],
};
