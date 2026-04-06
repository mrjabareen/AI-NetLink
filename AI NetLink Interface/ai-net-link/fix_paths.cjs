const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf-8');

// استبدال path.join(DB_PATH, 'Financial/xxx') إلى getSafePath(DB_PATH, 'Financial', 'xxx')
code = code.replace(/path\.join\(\s*DB_PATH\s*,\s*'Financial\/([^']+)'\s*\)/g, "getSafePath(DB_PATH, 'Financial', '$1')");

// استبدال path.join(DB_PATH, ...) الأخرى بـ getSafePath
code = code.replace(/path\.join\(\s*DB_PATH\s*,/g, 'getSafePath(DB_PATH,');

// استبدال subDir للـ Subscribers لتصبح آمنة
code = code.replace(/path\.join\(\s*subDir\s*,/g, 'getSafePath(subDir,');
code = code.replace(/path\.join\(\s*dirPath\s*,/g, 'getSafePath(dirPath,');

fs.writeFileSync('server.js', code);
console.log('Paths in server.js updated successfully!');