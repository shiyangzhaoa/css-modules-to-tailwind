import fs from 'fs';
import path from 'path';

export const combination = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../combination.json'), 'utf-8'));
