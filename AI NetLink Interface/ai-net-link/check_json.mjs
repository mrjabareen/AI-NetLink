import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '../../NetLink Enterprise DB/[01_DATABASE]');

// Managers
try {
  const dirPath = path.join(DB_PATH, 'Financial/System_Managers');
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  files.forEach(file => {
    try {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
      JSON.parse(content);
    } catch(e) {
      console.log('Error in Manager file:', file, e.message);
    }
  });
} catch(e) {}

// Subscribers
try {
  const dirPath = path.join(DB_PATH, 'Subscribers');
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  files.forEach(file => {
    try {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
      JSON.parse(content);
    } catch(e) {
      console.log('Error in Subscriber file:', file, e.message);
    }
  });
} catch(e) {}

console.log('JSON Check complete.');
