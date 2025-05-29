const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern to match toast calls that are NOT error toasts
  // This matches toast({ ... }) blocks that don't contain variant: "destructive" or variant: "warning"
  const toastPattern = /toast\(\{\s*([^}]*(?:\{[^}]*\}[^}]*)*)\s*\}\);?/gs;
  
  content = content.replace(toastPattern, (match, toastContent) => {
    // Skip if it's an error or warning toast
    if (toastContent.includes('variant: "destructive"') || 
        toastContent.includes('variant: "warning"') ||
        toastContent.includes("variant: 'destructive'") ||
        toastContent.includes("variant: 'warning'")) {
      return match;
    }
    
    // Remove informational toasts
    modified = true;
    console.log(`Removing toast from ${filePath}`);
    return '';
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

function findTypeScriptFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findTypeScriptFiles(fullPath));
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Process all TypeScript files in client/src
const files = findTypeScriptFiles('client/src');
files.forEach(processFile);

console.log('Done removing informational toasts');
