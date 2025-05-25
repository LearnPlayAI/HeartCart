// Quick fix for the publication error - removing invalid database fields
const fs = require('fs');

// Read the storage file
let content = fs.readFileSync('server/storage.ts', 'utf8');

// Fix the database field mapping issues
content = content.replace(/numberValue: null,\s*/g, '');
content = content.replace(/booleanValue: null,\s*/g, '');

// Write the fixed content back
fs.writeFileSync('server/storage.ts', content);

console.log('Fixed database field mapping issues for publication');