const fs = require('fs');
const path = require('path');

function patchJwtStrategy() {
  const filePath = path.resolve('backend/src/auth/strategies/jwt.strategy.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  const isCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  const target = "jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),";
  const replacement = `jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    if (isCRLF) content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated backend/src/auth/strategies/jwt.strategy.ts');
  } else {
    console.log('Target not found in jwt.strategy.ts');
  }
}

patchJwtStrategy();
