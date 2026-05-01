import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./power.config.json', 'utf8'));
const { environmentId, appId } = config;

const url = `https://apps.powerapps.com/play/e/${environmentId}/app/${appId}?hidenavbar=true`;
console.log('\n▶  Play URL (with hidenavbar):');
console.log(`   ${url}\n`);
