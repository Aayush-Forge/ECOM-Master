import assert from 'node:assert';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

console.log('\n===============================================================');
console.log(' MASTER TEST: FESTIVE BUNDLE UI & MODAL ROUTING VERIFICATION');
console.log('===============================================================\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function pass(msg) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  }

  function fail(msg, err) {
    console.error(`  [FAIL] ${msg}:`, err?.message || err);
    failed++;
  }

  // -------------------------------------------------------------
  // SUITE 1: HTTP & Markup Assertions for /clubbing High-Contrast UI
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Festive Module (/clubbing) High-Contrast UI ---');
  try {
    const res = await fetch('http://localhost:3000/clubbing');
    assert.strictEqual(res.status, 200);
    const html = await res.text();

    assert.ok(!html.includes('Something went wrong'), 'Should not contain error boundary');
    pass('/clubbing loads cleanly with HTTP 200');

    // High contrast package contents typography
    assert.ok(html.includes('Package Contents'), 'Contains package contents title');
    assert.ok(html.includes('View on Products Page'), 'Contains View on Products Page banner link');
    assert.ok(html.includes('View Bundle Products'), 'Contains View Bundle Products button in action bar');
    pass('Renders prominent links and CTA to view bundle on the Products page');

    assert.ok(
      html.includes('/products?category=festive-bundles&amp;bundle=diwali-sacred-divine-box') ||
      html.includes('/products?category=festive-bundles&bundle=diwali-sacred-divine-box'),
      'Links pass bundle ID query parameter'
    );
    pass('Banner and buttons correctly link to /products?category=festive-bundles&bundle=diwali-sacred-divine-box');

    // Robust borders & high contrast
    assert.ok(html.includes('bg-gradient-to-r from-[#4D0013]') || html.includes('bg-[#4D0013]'), 'Pricing bar uses royal temple crimson gradient');
    assert.ok(html.includes('text-[#FFD700]'), 'Prices render in gleaming gold #FFD700');
    assert.ok(html.includes('100% FREE') || html.includes('FREE GIFT'), 'Complimentary bonus displays solid FREE GIFT pill');
    pass('Pricing bar, gift card, and typography use rich high-contrast royal crimson and gold palette');
  } catch (e) {
    fail('Festive module /clubbing markup check failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 2: HTTP & Markup Assertions for /products with Bundle Param
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Products Page (/products) & Bundle Details Modal ---');
  try {
    const res = await fetch('http://localhost:3000/products?category=festive-bundles&bundle=diwali-sacred-divine-box');
    assert.strictEqual(res.status, 200);
    const html = await res.text();

    assert.ok(!html.includes('Something went wrong'), 'Should not contain error boundary');
    pass('/products?category=festive-bundles&bundle=diwali-sacred-divine-box returns HTTP 200');

    assert.ok(html.includes('View All Products in Bundle'), 'Grid cards feature "View All Products in Bundle" button');
    pass('Bundle grid card includes interactive "View All Products in Bundle" CTA');

    assert.ok(html.includes('Products Included in this Package'), 'Renders modal package contents header');
    pass('Detailed bundle modal renders with "Products Included in this Package"');

    // Assert product specifics are rendered for reading
    assert.ok(html.includes('The Maharaja Luxury Sticks'), 'Contains product 1 title');
    assert.ok(html.includes('Royal Mysore Sandalwood'), 'Contains product 2 title');
    assert.ok(html.includes('Divine Rose Incense Sticks'), 'Contains product 3 title');
    assert.ok(html.includes('Aroma Profile:'), 'Renders rich Aroma Profile details');
    assert.ok(html.includes('Ingredients:'), 'Renders natural Ingredients details');
    pass('Users can watch and read about all products, aroma notes, and ingredients in the bundle');

    assert.ok(html.includes('Festive Complimentary Bonus'), 'Renders complimentary gift bonus details');
    assert.ok(html.includes('Add Pack to Cart') || html.includes('Add Festive Pack to Cart'), 'Includes 1-click Add Pack CTA');
    assert.ok(html.includes('Buy Package Now'), 'Includes 1-click Buy Package Now CTA');
    pass('Modal includes rich complimentary gift section and 1-click checkout CTAs');
  } catch (e) {
    fail('Products page bundle modal check failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 3: Real Browser CDP Execution (Zero Errors, Live Interaction)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Real Browser CDP Execution ---');
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

    // 1. Visit /clubbing in real browser
    capturedErrors = [];
    console.log('  Navigating to http://localhost:3000/clubbing ...');
    await send('Page.navigate', { url: 'http://localhost:3000/clubbing' });
    await new Promise(r => setTimeout(r, 3000));

    assert.strictEqual(capturedErrors.length, 0, 'Console errors on /clubbing');
    pass('Festive page /clubbing loaded in browser with 0 errors');

    // 2. Visit /products?category=festive-bundles&bundle=diwali-sacred-divine-box in real browser
    capturedErrors = [];
    console.log('  Navigating to http://localhost:3000/products?category=festive-bundles&bundle=diwali-sacred-divine-box ...');
    await send('Page.navigate', { url: 'http://localhost:3000/products?category=festive-bundles&bundle=diwali-sacred-divine-box' });
    await new Promise(r => setTimeout(r, 3000));

    const modalCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('div.fixed.inset-0.z-50');
        const modalTitle = modal ? modal.querySelector('h2')?.innerText : null;
        const productsCount = modal ? modal.querySelectorAll('h4').length : 0;
        return {
          hasModal: !!modal,
          title: modalTitle,
          productsCount: productsCount,
          hasAroma: modal ? modal.innerText.includes('Aroma Profile') : false,
          hasIngredients: modal ? modal.innerText.includes('Ingredients') : false
        };
      })()`,
      returnByValue: true
    });

    const info = modalCheck.result?.value;
    console.log('  Modal check result:', JSON.stringify(info));

    assert.ok(info?.hasModal, 'Modal element should be present in DOM');
    assert.strictEqual(info?.title, 'Diwali Sacred Divine Gift Box');
    assert.ok(info?.productsCount >= 3, 'Modal should display at least 3 item cards');
    assert.ok(info?.hasAroma, 'Modal should display aroma profile');
    assert.ok(info?.hasIngredients, 'Modal should display ingredients');
    pass('Bundle details modal automatically opened and displays complete product details in real browser');

    assert.strictEqual(capturedErrors.length, 0, 'No console errors while viewing modal');
    pass('Modal interactions and rendering have 0 console errors');

    ws.close();
  } catch (e) {
    fail('Real browser CDP test failed', e);
  } finally {
    browserProc.kill();
  }

  console.log('\n===============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
