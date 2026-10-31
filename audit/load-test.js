const http = require('http');

async function testEndpoint(path, totalReqs = 50, concurrency = 10) {
  const times = [];
  let errors = 0;

  async function worker() {
    while (times.length + errors < totalReqs) {
      const idx = times.length + errors;
      const start = Date.now();
      await new Promise((resolve) => {
        const req = http.get(`http://localhost:5000${path}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const duration = Date.now() - start;
            if (res.statusCode >= 200 && res.statusCode < 400) {
              times.push(duration);
            } else {
              errors++;
            }
            resolve();
          });
        });
        req.on('error', () => {
          errors++;
          resolve();
        });
        req.setTimeout(5000, () => {
          req.destroy();
          errors++;
          resolve();
        });
      });
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / (times.length || 1);
  const p50 = times[Math.floor(times.length * 0.50)] || 0;
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const p99 = times[Math.floor(times.length * 0.99)] || 0;

  return {
    path,
    totalRequests: totalReqs,
    successful: times.length,
    errors,
    avgMs: avg.toFixed(1),
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99,
  };
}

async function run() {
  console.log('=== LOAD & LATENCY RESILIENCE TEST ===');
  const endpoints = ['/health', '/products', '/categories', '/company-profile/public'];
  const report = [];

  for (const ep of endpoints) {
    const res = await testEndpoint(ep, 50, 10);
    report.push(res);
    console.log(`Endpoint: ${ep.padEnd(25)} | OK: ${res.successful}/${res.totalRequests} | Avg: ${res.avgMs}ms | p95: ${res.p95Ms}ms | Errors: ${res.errors}`);
  }

  require('fs').writeFileSync(__dirname + '/load_test_results.json', JSON.stringify(report, null, 2));
}

run();
