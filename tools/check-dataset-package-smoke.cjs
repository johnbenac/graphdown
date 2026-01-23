#!/usr/bin/env node
'use strict';

const { execSync } = require('node:child_process');

execSync('npm --workspace packages/dataset run build', { stdio: 'inherit' });

execSync(
  "node -e \"import('@graphmd/dataset').then(m=>{ if(!m.validateDatasetSnapshot) process.exit(1); }).catch(e=>{ console.error(e); process.exit(1); })\"",
  { stdio: 'inherit' }
);

execSync(
  "node -e \"const m = require('@graphmd/dataset'); if(!m.validateDatasetSnapshot) process.exit(1);\"",
  { stdio: 'inherit' }
);

console.log('[smoke] @graphmd/dataset import/require ok');
