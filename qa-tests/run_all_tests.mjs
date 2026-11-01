import { spawnSync } from 'child_process';
import path from 'path';

console.log('====================================================');
console.log('       SRIDATTAM MASTER QA TEST SUITE RUNNER       ');
console.log('====================================================\n');

const testScripts = [
  'test_auth_matrix.mjs',
  'test_idor_and_ownership.mjs',
  'test_validation_and_injection.mjs',
  'test_pagination_filters_sorting.mjs',
  'test_business_logic.mjs',
  'test_webhooks_signatures.mjs',
  'test_infra_security_maintenance.mjs',
  'playwright_route_protection.mjs',
  'playwright_e2e_journey.mjs',
];

let totalPassed = 0;
let totalFailed = 0;

for (const script of testScripts) {
  console.log(`>>> RUNNING: ${script}`);
  const scriptPath = path.join('qa-tests', script);
  const result = spawnSync('node', [scriptPath], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status === 0) {
    console.log(`[PASS] ${script}\n`);
    totalPassed++;
  } else {
    console.error(`[FAIL] ${script} (Exit Code: ${result.status})\n`);
    totalFailed++;
  }
}

console.log('====================================================');
console.log(`SUITE SUMMARY: Passed: ${totalPassed} | Failed: ${totalFailed}`);
console.log('====================================================');
