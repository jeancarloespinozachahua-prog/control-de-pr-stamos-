const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const comando = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
const argumentos =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm run db:migrate']
    : ['run', 'db:migrate'];
const proceso = spawn(comando, argumentos, {
  cwd: root,
  stdio: 'inherit',
});

proceso.on('error', (error) => {
  console.error('No se pudieron iniciar las migraciones del proyecto principal:', error);
  process.exitCode = 1;
});

proceso.on('close', (codigo) => {
  process.exitCode = codigo ?? 1;
});
