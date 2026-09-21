import { spawn } from 'node:child_process';

const port = 8799;
const child = spawn('npx', ['wrangler', 'dev', '--config', 'wrangler.security-test.toml', '--ip', '127.0.0.1', '--port', String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, XDG_CONFIG_HOME: '/tmp/kiguflow-wrangler-security-test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
const ready = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`Worker did not start. ${output}`)), 30_000);
  const capture = (chunk: Buffer) => {
    output += chunk.toString();
    if (output.includes(`127.0.0.1:${port}`)) { clearTimeout(timeout); resolve(); }
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.once('exit', (code) => reject(new Error(`Worker exited with code ${code}. ${output}`)));
});

try {
  await ready;
  const response = await fetch(`http://127.0.0.1:${port}`);
  const result = await response.json() as { correct?: boolean; incorrect?: boolean };
  if (!response.ok || result.correct !== true || result.incorrect !== false) throw new Error(`Unexpected Worker result: ${JSON.stringify(result)}`);
  console.log('Worker-runtime password verification passed.');
} finally {
  child.kill('SIGTERM');
}
