import fs from 'fs';
import path from 'path';
import ts from '../backend/node_modules/typescript/lib/typescript.js';
import jwt from '../backend/node_modules/jsonwebtoken/index.js';

const BACKEND_URL = 'http://localhost:5000';
const JWT_SECRET = 'sridattam-dev-jwt-access-secret-key-2026';

function discoverEndpoints() {
  const backendSrc = path.resolve('backend/src');
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.controller.ts')) files.push(full);
    }
  }
  walk(backendSrc);

  const endpoints = [];
  for (const filePath of files) {
    const code = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

    function visit(node) {
      if (ts.isClassDeclaration(node)) {
        let ctrlPrefixes = [''];
        let classIsPublic = false;
        let classRoles = null;
        let classGuards = [];

        const decorators = ts.getDecorators(node) || [];
        for (const dec of decorators) {
          const text = dec.getText(sourceFile);
          if (text.startsWith('@Controller')) {
            const arrMatch = text.match(/@Controller\s*\(\s*\[(.*?)\]\s*\)/);
            if (arrMatch) {
              const rawItems = arrMatch[1].split(',').map(s => s.trim().replace(/^['"`]|['"`]$/g, ''));
              ctrlPrefixes = rawItems.filter(Boolean);
              if (ctrlPrefixes.length === 0) ctrlPrefixes = [''];
            } else {
              const match = text.match(/@Controller\s*\(\s*(?:['"`](.*?)['"`])?\s*\)/);
              ctrlPrefixes = match && match[1] ? [match[1]] : [''];
            }
          }
          if (text.startsWith('@Public')) classIsPublic = true;
          if (text.startsWith('@Roles')) classRoles = text;
          if (text.startsWith('@UseGuards')) classGuards.push(text);
        }

        for (const member of node.members) {
          if (ts.isMethodDeclaration(member)) {
            const memberDecorators = ts.getDecorators(member) || [];
            let httpVerb = null;
            let methodPath = '';
            let methodIsPublic = false;
            let methodRoles = null;
            let methodGuards = [];

            for (const dec of memberDecorators) {
              const decText = dec.getText(sourceFile);
              const verbMatch = decText.match(/@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*(?:['"`](.*?)['"`])?\s*\)/);
              if (verbMatch) {
                httpVerb = verbMatch[1].toUpperCase();
                methodPath = verbMatch[2] || '';
              }
              if (decText.startsWith('@Public')) methodIsPublic = true;
              if (decText.startsWith('@Roles')) methodRoles = decText;
              if (decText.startsWith('@UseGuards')) methodGuards.push(decText);
            }

            if (httpVerb) {
              for (const ctrlPrefix of ctrlPrefixes) {
                let fullPath = '/' + [ctrlPrefix, methodPath].filter(Boolean).join('/').replace(/\/+/g, '/').replace(/\/$/, '');
                if (!fullPath) fullPath = '/';

                endpoints.push({
                  file: path.relative(process.cwd(), filePath),
                  className: node.name?.getText(sourceFile) || 'AnonymousClass',
                  handler: member.name.getText(sourceFile),
                  verb: httpVerb,
                  path: fullPath,
                  isPublic: methodIsPublic || classIsPublic,
                  roles: methodRoles || classRoles || (methodIsPublic || classIsPublic ? 'None (Public)' : 'Authenticated (Any Role)'),
                  guards: [...classGuards, ...methodGuards].join(', ') || 'Global Guards',
                });
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return endpoints;
}

async function login(email, password) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

function createExpiredToken() {
  const payload = {
    sub: '00000000-0000-0000-0000-000000000000',
    email: 'expired@sridattam.com',
    role: 'customer',
    iat: Math.floor(Date.now() / 1000) - 3600,
    exp: Math.floor(Date.now() / 1000) - 1800,
  };
  return jwt.sign(payload, JWT_SECRET);
}

function createTamperedToken(validToken) {
  const parts = validToken.split('.');
  const sig = parts[2];
  const tamperedSig = sig.slice(0, -4) + 'XXXX';
  return `${parts[0]}.${parts[1]}.${tamperedSig}`;
}

async function runAuthMatrix() {
  console.log('Authenticating roles...');
  const admin = await login('admin@sridattam.com', 'password123');
  const editor = await login('editor@sridattam.com', 'password123');
  const readOnly = await login('read_only@sridattam.com', 'password123');
  const customer = await login('customer@sridattam.com', 'password123');

  const expiredToken = createExpiredToken();
  const tamperedToken = createTamperedToken(admin.token);

  const authScenarios = [
    { name: 'No Token', header: {} },
    { name: 'Expired Token', header: { Authorization: `Bearer ${expiredToken}` } },
    { name: 'Tampered Token', header: { Authorization: `Bearer ${tamperedToken}` } },
    { name: 'Customer Role', header: { Authorization: `Bearer ${customer.token}` } },
    { name: 'Read-Only Role', header: { Authorization: `Bearer ${readOnly.token}` } },
    { name: 'Editor Role', header: { Authorization: `Bearer ${editor.token}` } },
    { name: 'Admin Role', header: { Authorization: `Bearer ${admin.token}` } },
  ];

  const endpoints = discoverEndpoints();
  console.log(`Discovered ${endpoints.length} endpoints. Running 7 scenarios each (${endpoints.length * 7} requests)...`);

  const results = [];
  const findings = [];

  for (const ep of endpoints) {
    let testPath = ep.path
      .replace(/:id/g, '00000000-0000-0000-0000-000000000000')
      .replace(/:slug/g, 'test-slug')
      .replace(/:orderId/g, '00000000-0000-0000-0000-000000000000')
      .replace(/:phoneKey/g, '9876543210')
      .replace(/:key/g, 'test-key');

    const epResult = {
      endpoint: `${ep.verb} ${ep.path}`,
      file: ep.file,
      handler: ep.handler,
      isPublic: ep.isPublic,
      configuredRoles: ep.roles,
      scenarios: {},
    };

    for (const scenario of authScenarios) {
      try {
        const res = await fetch(`${BACKEND_URL}${testPath}`, {
          method: ep.verb,
          headers: {
            'Content-Type': 'application/json',
            ...scenario.header,
          },
          body: ['POST', 'PUT', 'PATCH'].includes(ep.verb) ? JSON.stringify({}) : undefined,
        });

        epResult.scenarios[scenario.name] = res.status;
      } catch (err) {
        epResult.scenarios[scenario.name] = `ERR: ${err.message}`;
      }
    }

    results.push(epResult);

    const noTok = epResult.scenarios['No Token'];
    const expTok = epResult.scenarios['Expired Token'];
    const tampTok = epResult.scenarios['Tampered Token'];
    const cust = epResult.scenarios['Customer Role'];
    const ro = epResult.scenarios['Read-Only Role'];
    const ed = epResult.scenarios['Editor Role'];
    const adm = epResult.scenarios['Admin Role'];

    // 1. Unguarded / public leak check
    if (!ep.isPublic && noTok !== 401 && noTok !== 403) {
      findings.push({
        type: 'UNGUARDED_PROTECTED_ENDPOINT',
        severity: 'High',
        endpoint: `${ep.verb} ${ep.path}`,
        reason: `Configured as protected (${ep.roles}) but responded with HTTP ${noTok} without token`,
        file: ep.file,
      });
    }

    // 2. Expired / tampered token accepted
    if (!ep.isPublic && (expTok === 200 || expTok === 201 || expTok === 204)) {
      findings.push({
        type: 'EXPIRED_TOKEN_ACCEPTED',
        severity: 'Critical',
        endpoint: `${ep.verb} ${ep.path}`,
        reason: `Accepted expired token with HTTP ${expTok}`,
        file: ep.file,
      });
    }
    if (!ep.isPublic && (tampTok === 200 || tampTok === 201 || tampTok === 204)) {
      findings.push({
        type: 'TAMPERED_TOKEN_ACCEPTED',
        severity: 'Critical',
        endpoint: `${ep.verb} ${ep.path}`,
        reason: `Accepted tampered token with HTTP ${tampTok}`,
        file: ep.file,
      });
    }

    // 3. RBAC escalation
    if (ep.roles.includes('ADMIN') && cust !== 403 && cust !== 401 && cust !== 404) {
      findings.push({
        type: 'RBAC_ESCALATION_CUSTOMER_TO_ADMIN',
        severity: 'Critical',
        endpoint: `${ep.verb} ${ep.path}`,
        reason: `Admin-only endpoint responded with HTTP ${cust} to Customer role`,
        file: ep.file,
      });
    }
    if (ep.roles.includes('ADMIN') && ro !== 403 && ro !== 401 && ro !== 404) {
      findings.push({
        type: 'RBAC_ESCALATION_READONLY_TO_ADMIN',
        severity: 'High',
        endpoint: `${ep.verb} ${ep.path}`,
        reason: `Admin-only endpoint responded with HTTP ${ro} to Read-Only role`,
        file: ep.file,
      });
    }
  }

  console.log(`\n=== AUTH MATRIX RESULTS SUMMARY ===`);
  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`Total Findings: ${findings.length}`);
  if (findings.length > 0) {
    console.log(`Findings:`, JSON.stringify(findings, null, 2));
  } else {
    console.log(`All protected endpoints rejected invalid/missing tokens and enforced RBAC correctly!`);
  }

  // Sample check for 10 endpoints
  console.log('\nSample endpoint status matrix:');
  for (const r of results.slice(0, 15)) {
    console.log(`${r.endpoint.padEnd(35)} | Public: ${String(r.isPublic).padEnd(5)} | Roles: ${r.configuredRoles.slice(0, 20).padEnd(20)} | NoTok: ${r.scenarios['No Token']} | Cust: ${r.scenarios['Customer Role']} | RO: ${r.scenarios['Read-Only Role']} | Ed: ${r.scenarios['Editor Role']} | Adm: ${r.scenarios['Admin Role']}`);
  }
}

runAuthMatrix().catch(console.error);
