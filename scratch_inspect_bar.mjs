import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const bravePath = `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`;
const edgePath = `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`;
const browserExe = fs.existsSync(bravePath) ? bravePath : edgePath;

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
  await new Promise(r => ws.addEventListener('open', r));

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data.result);
      pending.delete(data.id);
    }
  });

  await send('Page.navigate', { url: 'http://localhost:3000/clubbing' });
  await new Promise(r => setTimeout(r, 2500));

  const stylesRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const bars = document.querySelectorAll('section div.rounded-2xl.p-6');
      const lastBar = bars[bars.length - 1];
      const bonusCards = document.querySelectorAll('div.sm\\\\:col-span-2');
      const lastBonus = bonusCards[bonusCards.length - 1];
      return {
        barCount: bars.length,
        barBg: lastBar ? getComputedStyle(lastBar).backgroundColor : null,
        barColor: lastBar ? getComputedStyle(lastBar).color : null,
        barBorder: lastBar ? getComputedStyle(lastBar).border : null,
        barClasses: lastBar ? lastBar.className : null,
        bonusBg: lastBonus ? getComputedStyle(lastBonus).backgroundColor : null,
        bonusBorder: lastBonus ? getComputedStyle(lastBonus).border : null,
        bonusColor: lastBonus ? getComputedStyle(lastBonus).color : null,
        bonusClasses: lastBonus ? lastBonus.className : null,
        bonusFreePill: lastBonus ? {
          text: lastBonus.querySelector('span:last-child')?.innerText,
          bg: getComputedStyle(lastBonus.querySelector('span:last-child')).backgroundColor,
          color: getComputedStyle(lastBonus.querySelector('span:last-child')).color,
        } : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Computed styles on /clubbing:', JSON.stringify(stylesRes.result?.value, null, 2));
  ws.close();
} finally {
  browserProc.kill();
}
