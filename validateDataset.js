#!/usr/bin/env node
// Thin wrapper to keep the legacy entrypoint working after the CLI moved to TypeScript.
// The compiled module lives in dist/validateDatasetCli.js.
/* eslint-disable @typescript-eslint/no-var-requires */
const { main } = require('./dist/validateDatasetCli.js');

main();
