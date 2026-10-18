import { spawn } from 'node:child_process';
import { createServer as createPortProbe } from 'node:net';
import { createInterface } from 'node:readline';
import { createServer } from 'vite';

// Ask the OS for a port; Vite can retry if another process wins the bind race.
const probe = createPortProbe();
await new Promise((resolve, reject) => {
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', resolve);
});
const port = probe.address().port;
await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
const vite = await createServer({ server: { host: '127.0.0.1', port, strictPort: false, open: false } });
let paja;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  paja?.kill('SIGTERM');
  await vite.close();
  process.exitCode = code;
}
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
try {
  await vite.listen();
  const target = `http://127.0.0.1:${vite.httpServer.address().port}/`;
  console.log(`Vite target: ${target}`);
  paja = spawn('kehto', ['paja', '--target-url', target, '--port', '0'], {
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  paja.once('error', error => {
    console.error(`Unable to start Paja: ${error.message}. Install the kehto CLI and ensure it is on PATH.`);
    void stop(1);
  });
  paja.once('exit', code => void stop(stopping ? 0 : (code ?? 1)));
  let opened = false;
  createInterface({ input: paja.stdout }).on('line', line => {
    console.log(line);
    const match = /^Runtime URL: (http:\/\/127\.0\.0\.1:\d+\/)\s*$/.exec(line);
    if (match && !opened && !stopping) {
      opened = true;
      vite.config.server.open = match[1];
      vite.openBrowser();
    }
  });
} catch (error) {
  console.error(error);
  await stop(1);
}
