#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const outDir = path.join(__dirname, '..', 'dist-cjs');
fs.mkdirSync(outDir, { recursive: true });

const pkg = { type: 'commonjs' };
fs.writeFileSync(path.join(outDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
