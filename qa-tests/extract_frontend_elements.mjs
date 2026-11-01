import fs from 'fs';
import path from 'path';

function findInteractiveElements(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const elements = {
    buttons: [],
    links: [],
    inputs: [],
    selects: [],
    tabs: [],
    modals: [],
    dropdowns: [],
    toggles: []
  };

  // Find buttons: <button, <Button
  const buttonMatches = content.matchAll(/<(?:button|Button)[^>]*?(?:onClick|type|aria-label)[^>]*?>([\s\S]*?)<\/(?:button|Button)>/gi);
  for (const m of buttonMatches) {
    const text = m[1].replace(/<[^>]+>/g, '').trim().slice(0, 50);
    if (text) elements.buttons.push(text);
  }

  // Find Links: <Link, <a href
  const linkMatches = content.matchAll(/<(?:Link|a)\s+[^>]*?href=["'{]([^"'}>]+)["'}][^>]*?>([\s\S]*?)<\/(?:Link|a)>/gi);
  for (const m of linkMatches) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, '').trim().slice(0, 50);
    elements.links.push({ href, text: text || href });
  }

  // Find Tabs: <TabsTrigger, <TabsList
  const tabMatches = content.matchAll(/<TabsTrigger[^>]*?value=["']([^"']+)["'][^>]*?>([\s\S]*?)<\/TabsTrigger>/gi);
  for (const m of tabMatches) {
    elements.tabs.push({ value: m[1], label: m[2].replace(/<[^>]+>/g, '').trim() });
  }

  // Find Inputs: <input, <Input
  const inputMatches = content.matchAll(/<(?:input|Input)[^>]*?(?:name|placeholder|type)=["']([^"']+)["'][^>]*?>/gi);
  for (const m of inputMatches) {
    elements.inputs.push(m[1]);
  }

  // Find Dialog/Modal: <Dialog, <AlertDialog, <Modal
  if (/<(?:Dialog|AlertDialog)/.test(content)) {
    elements.modals.push('Dialog / Modal present');
  }

  // Find Switch / Toggle
  if (/<(?:Switch|Toggle)/.test(content)) {
    elements.toggles.push('Switch / Toggle present');
  }

  // Find Dropdown / Select
  if (/<(?:Select|DropdownMenu)/.test(content)) {
    elements.dropdowns.push('Select / DropdownMenu present');
  }

  return elements;
}

const storefrontDir = path.resolve('app');
const adminPortalDir = path.resolve('admin-portal/app');

function scanDir(baseDir) {
  const results = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.startsWith('page.') && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx'))) {
        const rel = path.relative(baseDir, full);
        results[rel] = findInteractiveElements(full);
      }
    }
  }
  walk(baseDir);
  return results;
}

const storefrontElements = scanDir(storefrontDir);
const adminElements = scanDir(adminPortalDir);

console.log('STOREFRONT_PAGES_COUNT:', Object.keys(storefrontElements).length);
console.log('ADMIN_PAGES_COUNT:', Object.keys(adminElements).length);
