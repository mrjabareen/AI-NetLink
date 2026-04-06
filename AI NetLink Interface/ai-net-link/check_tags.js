
import fs from 'fs';

const content = fs.readFileSync('c:/Users/aljabareen/Desktop/AI NetLink/AI NetLink Interface/ai-net-link/src/components/ManagementTab.tsx', 'utf8');

const openTags = (content.match(/<AnimatePresence/g) || []).length;
const closeTags = (content.match(/<\/AnimatePresence>/g) || []).length;

console.log(`AnimatePresence: Open=${openTags}, Close=${closeTags}`);

const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;

console.log(`Divs: Open=${openDivs}, Close=${closeDivs}`);

const openMotions = (content.match(/<motion\.div/g) || []).length;
const closeMotions = (content.match(/<\/motion\.div>/g) || []).length;

console.log(`Motion Divs: Open=${openMotions}, Close=${closeMotions}`);
