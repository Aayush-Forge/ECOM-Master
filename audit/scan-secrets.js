const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const findings = [];

// Patterns for secrets
const patterns = [
  { name: 'Razorpay Live Secret', regex: /rzp_live_[a-zA-Z0-9]{14,}/g },
  { name: 'Generic High-Entropy Secret / API Key', regex: /(?:api_key|apikey|secret|password|private_key|auth_token)\s*[:=]\s*['"][a-zA-Z0-9_\-+/]{20,}['"]/gi },
  { name: 'Cloudflare / AWS Secret Key', regex: /(?:aws_secret_access_key|r2_secret_access_key)\s*[:=]\s*['"][a-zA-Z0-9_\-+/]{30,}['"]/gi },
  { name: 'JWT Token Literal', regex: /eyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g },
  { name: 'Private Key PEM', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g },
];

function scanFile(filePath) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  if (relPath.includes('node_modules') || relPath.includes('.next') || relPath.includes('dist') || relPath.includes('.git')) {
    return;
  }
  
  // Read content
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return;
  }

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    patterns.forEach(p => {
      let match;
      const r = new RegExp(p.regex.source, p.regex.flags);
      while ((match = r.exec(line)) !== null) {
        // filter out comments, examples, test dummies
        const val = match[0];
        findings.push({
          pattern: p.name,
          file: relPath,
          line: idx + 1,
          snippet: line.trim().slice(0, 120),
        });
      }
    });
  });
}

function traverse(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (['node_modules', '.next', 'dist', '.git'].includes(item)) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      traverse(full);
    } else {
      scanFile(full);
    }
  }
}

traverse(ROOT_DIR);
console.log(`Scan completed. Found ${findings.length} potential secrets items.`);
fs.writeFileSync(path.join(__dirname, 'secrets_scan.json'), JSON.stringify(findings, null, 2));
console.table(findings.map(f => ({ pattern: f.pattern, file: f.file, line: f.line })));
