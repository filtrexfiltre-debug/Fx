const { spawn } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(npmCommand, ['run', 'api'], { stdio: 'inherit' }),
  spawn(npmCommand, ['run', 'dev:vite'], { stdio: 'inherit' }),
];

const shutdown = (signal) => {
  for (const child of children) child.kill(signal);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 130) {
      shutdown('SIGTERM');
      process.exitCode = code;
    }
  });
}
