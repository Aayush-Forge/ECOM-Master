const fs = require('fs');
const path = require('path');

const mainPath = path.resolve('backend/src/main.ts');
let content = fs.readFileSync(mainPath, 'utf8');
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const target = "app.use(helmet());";
const replacement = `app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https:"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  if (isCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(mainPath, content, 'utf8');
  console.log('Successfully updated helmet configuration in backend/src/main.ts');
} else {
  console.log('Target not found in backend/src/main.ts');
}
