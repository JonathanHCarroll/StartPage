#!/usr/bin/env node
/**
 * Print the web app URL for a deployment (Workspace vs consumer format).
 * Usage: node scripts/print-webapp-url.mjs [deploymentId]
 */
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const { google } = require(join(npmRoot, '@google/clasp/node_modules/googleapis'));

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const claspJson = JSON.parse(readFileSync(join(repoRoot, '.clasp.json'), 'utf8'));
const deploymentId =
  process.argv[2] || 'AKfycbzp2hb7l3RrycxDsGtvbN16JEotF2bKUDf9P_u6IBU_NAxdmllHqvWcOjO1ABLdbAcd';

const claspRcPath = process.env.CLASP_CONFIG_AUTH
  ? join(process.env.CLASP_CONFIG_AUTH, '.clasprc.json')
  : join(homedir(), '.clasprc.json');
if (!existsSync(claspRcPath)) {
  console.error('No .clasprc.json found. Run: clasp login');
  process.exit(1);
}

const claspRc = JSON.parse(readFileSync(claspRcPath, 'utf8'));
const token = claspRc.tokens[process.env.CLASP_USER || 'default'];
if (!token) {
  console.error('No clasp credentials for user:', process.env.CLASP_USER || 'default');
  process.exit(1);
}

const auth = new google.auth.OAuth2(token.client_id, token.client_secret);
auth.setCredentials({
  access_token: token.access_token,
  refresh_token: token.refresh_token,
  expiry_date: token.expiry_date,
});

const script = google.script({ version: 'v1', auth });
const { data } = await script.projects.deployments.get({
  scriptId: claspJson.scriptId,
  deploymentId,
});

const web = (data.entryPoints || []).find((e) => e.entryPointType === 'WEB_APP');
if (!web?.webApp?.url) {
  console.error('No web app entry point on deployment', deploymentId);
  process.exit(1);
}

const cfg = web.webApp.entryPointConfig || {};
console.log(web.webApp.url);
console.error('');
console.error(`Deployment: ${deploymentId}`);
console.error(`Version: @${data.deploymentConfig?.versionNumber ?? 'HEAD'}`);
console.error(`Access: ${cfg.access ?? '(unknown)'}`);
console.error(`Execute as: ${cfg.executeAs ?? '(unknown)'}`);
