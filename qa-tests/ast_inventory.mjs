import fs from 'fs';
import path from 'path';
import ts from '../backend/node_modules/typescript/lib/typescript.js';

const backendSrc = path.resolve('backend/src');

function getControllers() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.controller.ts')) {
        files.push(full);
      }
    }
  }
  walk(backendSrc);
  return files;
}

function parseFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

  const endpoints = [];

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
          // Check for array like @Controller(['clubbing-rules', 'clubbing'])
          const arrMatch = text.match(/@Controller\s*\(\s*\[(.*?)\]\s*\)/);
          if (arrMatch) {
            const rawItems = arrMatch[1].split(',').map(s => s.trim().replace(/^['"`]|['"`]$/g, ''));
            ctrlPrefixes = rawItems.filter(Boolean);
            if (ctrlPrefixes.length === 0) ctrlPrefixes = [''];
          } else {
            const match = text.match(/@Controller\s*\(\s*(?:['"`](.*?)['"`])?\s*\)/);
            if (match && match[1]) {
              ctrlPrefixes = [match[1]];
            } else {
              ctrlPrefixes = [''];
            }
          }
        }
        if (text.startsWith('@Public')) {
          classIsPublic = true;
        }
        if (text.startsWith('@Roles')) {
          classRoles = text;
        }
        if (text.startsWith('@UseGuards')) {
          classGuards.push(text);
        }
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
            if (decText.startsWith('@Public')) {
              methodIsPublic = true;
            }
            if (decText.startsWith('@Roles')) {
              methodRoles = decText;
            }
            if (decText.startsWith('@UseGuards')) {
              methodGuards.push(decText);
            }
          }

          if (httpVerb) {
            for (const ctrlPrefix of ctrlPrefixes) {
              let fullPath = '/' + [ctrlPrefix, methodPath].filter(Boolean).join('/').replace(/\/+/g, '/').replace(/\/$/, '');
              if (!fullPath) fullPath = '/';

              const params = member.parameters.map(p => {
                const pName = p.name.getText(sourceFile);
                const pType = p.type ? p.type.getText(sourceFile) : 'any';
                const pDecs = (ts.getDecorators(p) || []).map(d => d.getText(sourceFile));
                return { name: pName, type: pType, decorators: pDecs };
              });

              endpoints.push({
                file: path.relative(process.cwd(), filePath),
                className: node.name?.getText(sourceFile) || 'AnonymousClass',
                handler: member.name.getText(sourceFile),
                verb: httpVerb,
                path: fullPath,
                isPublic: methodIsPublic || classIsPublic,
                roles: methodRoles || classRoles || (methodIsPublic || classIsPublic ? 'None (Public)' : 'Authenticated (Any Role)'),
                guards: [...classGuards, ...methodGuards].join(', ') || 'Global Guards',
                params
              });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return endpoints;
}

const allControllers = getControllers();
const allEndpoints = [];
for (const file of allControllers) {
  allEndpoints.push(...parseFile(file));
}

allEndpoints.sort((a, b) => a.path.localeCompare(b.path) || a.verb.localeCompare(b.verb));

console.log(`TOTAL_DISCOVERED: ${allEndpoints.length}`);
let summary = {};
for (const ep of allEndpoints) {
  const key = `${ep.verb} ${ep.path}`;
  summary[key] = (summary[key] || 0) + 1;
}
console.log(`UNIQUE_ROUTE_VERB_COMBINATIONS: ${Object.keys(summary).length}`);
