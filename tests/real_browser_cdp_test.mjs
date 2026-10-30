import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const bravePath = `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`;
const edgePath = `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`;
const browserExe = fs.existsSync(bravePath) ? bravePath : edgePath;

console.log('Using browser:', browserExe);

const browserProc = spawn(browserExe, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Temp\\chrome-test-profile-' + Date.now(),
  'about:blank'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 1500));

try {
  const targets = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  let capturedErrors = [];

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data.result);
      pending.delete(data.id);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      capturedErrors.push(data.params.exceptionDetails);
    }
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      capturedErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  const testUrls = [
    { name: 'Homepage', url: 'http://localhost:3000' },
    { name: 'Festive Module', url: 'http://localhost:3000/clubbing' },
    { name: 'Products Catalog', url: 'http://localhost:3000/products' },
    { name: 'Festive Category Filter', url: 'http://localhost:3000/products?category=festive-bundles' },
  ];

  let allPassed = true;

  for (const page of testUrls) {
    capturedErrors = [];
    console.log(`\nNavigating to ${page.name} (${page.url}) ...`);
    await send('Page.navigate', { url: page.url });
    await new Promise(r => setTimeout(r, 3000));

    // Evaluate if error boundary text is in DOM
    const evalRes = await send('Runtime.evaluate', {
      expression: `({
        title: document.title,
        hasSomethingWentWrong: document.body.innerText.includes('Something went wrong'),
        bodyLength: document.body.innerText.length
      })`,
      returnByValue: true
    });

    const info = evalRes.result?.value;
    console.log(`  Page Info: title="${info?.title}", textLength=${info?.bodyLength}, errorBoundary=${info?.hasSomethingWentWrong}`);

    if (info?.hasSomethingWentWrong || capturedErrors.length > 0) {
      console.error(`  [FAIL] ${page.name} encountered errors!`);
      for (const err of capturedErrors) console.error('   ', err);
      allPassed = false;
    } else {
      console.log(`  [PASS] ${page.name} rendered cleanly with 0 errors!`);
    }
  }

  ws.close();
  if (!allPassed) process.exit(1);
} catch (e) {
  console.error('CDP Error:', e);
  process.exit(1);
} finally {
  browserProc.kill();
  console.log('\nAll browser sessions closed.');
}
