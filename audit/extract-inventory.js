const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.join(__dirname, '..', 'backend', 'src');

function parseControllers() {
  const controllers = [];
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.controller.ts')) {
        controllers.push(fullPath);
      }
    }
  }
  scanDir(BACKEND_SRC);

  const routeInventory = [];

  for (const cPath of controllers) {
    const content = fs.readFileSync(cPath, 'utf8');
    const relativePath = path.relative(path.join(__dirname, '..'), cPath).replace(/\\/g, '/');
    
    // Find Controller prefix
    const controllerMatch = content.match(/@Controller\s*\(\s*(['"`]?)(.*?)\1\s*\)/s);
    const controllerPrefix = controllerMatch ? controllerMatch[2].replace(/['"`]/g, '').trim() : '';

    // Check class-level decorators
    const isClassPublic = /@Public\s*\(\s*\)/.test(content.split(/export\s+class/)[0]);
    const classRolesMatch = content.split(/export\s+class/)[0].match(/@Roles\s*\((.*?)\)/s);
    const classRoles = classRolesMatch ? classRolesMatch[1].replace(/\s+/g, ' ') : null;

    // Split methods
    // We can regex search for @Get, @Post, @Put, @Patch, @Delete, @All
    const methodRegex = /(@Public\s*\(\s*\)|@SkipThrottle\s*\(\s*\)|@Roles\s*\([^)]+\)|@UseGuards\s*\([^)]+\)|@UseInterceptors\s*\([^)]+\)|@AuditLog\s*\([^)]+\)|@HttpCode\s*\([^)]+\)|\/\*\*[\s\S]*?\*\/|\/\/[^\n]*)*\s*@(Get|Post|Put|Patch|Delete|All|Options|Head)\s*\(\s*(?:['"`](.*?)['"`]|\[(.*?)\])?\s*\)[\s\S]*?(?:async\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)/g;

    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      const precedingDecorators = match[0];
      const httpMethod = match[2].toUpperCase();
      let routePath = match[3] || match[4] || '';
      const methodName = match[5];
      const params = match[6];

      // Clean route path
      let paths = [routePath];
      if (match[4]) {
        // array of paths, e.g. ['admin/all-categories', 'categories']
        paths = match[4].split(',').map(s => s.replace(/['"`\s]/g, ''));
      }

      for (let p of paths) {
        let fullRoute = '';
        if (p.startsWith('/')) {
          fullRoute = p;
        } else if (controllerPrefix) {
          fullRoute = controllerPrefix.endsWith('/') ? `${controllerPrefix}${p}` : `${controllerPrefix}${p ? '/' + p : ''}`;
        } else {
          fullRoute = p ? `/${p}` : '/';
        }
        if (!fullRoute.startsWith('/')) fullRoute = '/' + fullRoute;

        const isPublic = isClassPublic || /@Public\s*\(\s*\)/.test(precedingDecorators);
        const rolesMatch = precedingDecorators.match(/@Roles\s*\((.*?)\)/s);
        const roles = rolesMatch ? rolesMatch[1].replace(/\s+/g, ' ') : (classRoles || 'DEFAULT (Authenticated)');

        // Extract DTOs
        const dtos = [];
        const bodyMatch = params.match(/@Body\s*\([^)]*\)\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>]+)/);
        if (bodyMatch) dtos.push(`Body: ${bodyMatch[2]}`);
        const queryMatch = params.match(/@Query\s*\([^)]*\)\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>]+)/);
        if (queryMatch) dtos.push(`Query: ${queryMatch[2]}`);
        const paramMatch = params.match(/@Param\s*\([^)]*\)\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>]+)/);
        if (paramMatch) dtos.push(`Param: ${paramMatch[2]}`);

        routeInventory.push({
          file: relativePath,
          controller: path.basename(cPath),
          methodName,
          httpMethod,
          path: fullRoute,
          isPublic,
          roles,
          dtos: dtos.join(', ') || 'None'
        });
      }
    }
  }

  return routeInventory;
}

const routes = parseControllers();
console.log(`Parsed ${routes.length} routes.`);
fs.writeFileSync(path.join(__dirname, 'routes.json'), JSON.stringify(routes, null, 2));
