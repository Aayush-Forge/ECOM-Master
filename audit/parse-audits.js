const fs = require('fs');
const path = require('path');

function readJsonFile(p) {
  let buf = fs.readFileSync(p);
  // Detect UTF-16 LE BOM (FF FE)
  let str;
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    str = buf.toString('utf16le');
  } else {
    str = buf.toString('utf8');
  }
  str = str.replace(/^\uFEFF/, '').trim();
  return JSON.parse(str);
}

const reports = ['npm_audit_root.json', 'npm_audit_backend.json', 'npm_audit_admin.json'];

reports.forEach(r => {
  const p = path.join(__dirname, r);
  try {
    const data = readJsonFile(p);
    console.log(`\n=== Report: ${r} ===`);
    if (data.metadata?.vulnerabilities) {
      console.log('Vulnerabilities count:', data.metadata.vulnerabilities);
      console.log('Total dependencies:', data.metadata.dependencies?.total);
    }
    if (data.vulnerabilities) {
      const vulns = Object.values(data.vulnerabilities);
      console.log(`Detailed vulnerable packages (${vulns.length}):`);
      vulns.forEach(v => {
        console.log(`- ${v.name} (${v.severity}): ${v.range} via ${v.via?.map(x => typeof x === 'string' ? x : x.title || x.name).join(', ')}`);
      });
    }
  } catch (err) {
    console.error(`Error parsing ${r}:`, err.message);
  }
});
