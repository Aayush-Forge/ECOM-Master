import fs from 'fs';
import path from 'path';

const patterns = [
  { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Hardcoded DB Password in compose/code', regex: /(?:postgres|postgresql):\/\/[a-zA-Z0-9_-]+:([a-zA-Z0-9_!@#$%^&*()+=]+)@/i },
  { name: 'Razorpay Live Key', regex: /rzp_live_[a-zA-Z0-9]{14,}/ },
  { name: 'AWS/R2 Secret Key', regex: /(?:aws_secret_access_key|R2_SECRET_ACCESS_KEY)\s*[:=]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/i },
  { name: 'Generic Secret in code', regex: /(?:jwt_secret|jwt_refresh_secret|api_key|secret_key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{8,}['"]/i },
];

const ignoredDirs = new Set(['node_modules', '.git', '.next', 'dist', 'playwright-report', 'test-results']);

function scan(dir) {
  const findings = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findings.push(...scan(full));
    } else if (entry.isFile()) {
      // Don't flag .env or .env.example files themselves as "hardcoded in code" unless they have live keys
      const rel = path.relative(process.cwd(), full);
      const isEnv = rel.includes('.env');
      const content = fs.readFileSync(full, 'utf8');
      
      for (const p of patterns) {
        let match;
        const r = new RegExp(p.regex.source, p.regex.flags + (p.regex.flags.includes('g') ? '' : 'g'));
        while ((match = r.exec(content)) !== null) {
          // If it's docker-compose.yml with password
          if (p.name === 'Hardcoded DB Password in compose/code' && rel === 'docker-compose.yml') {
            findings.push({
              file: rel,
              name: p.name,
              match: match[0].slice(0, 30) + '...',
              line: content.substring(0, match.index).split('\n').length
            });
          } else if (!isEnv && p.name !== 'Hardcoded DB Password in compose/code') {
            findings.push({
              file: rel,
              name: p.name,
              match: match[0].slice(0, 30) + '...',
              line: content.substring(0, match.index).split('\n').length
            });
          }
        }
      }
    }
  }
  return findings;
}

const results = scan(process.cwd());
console.log(JSON.stringify(results, null, 2));
