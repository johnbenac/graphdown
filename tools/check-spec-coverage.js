#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  DEFAULT_DEFERRED_VERIFY,
  normalizeVerify,
  classifyRequirements,
} = require('./spec-verify-policy.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const MATRIX_PATH = path.join(REPO_ROOT, 'artifacts', 'spec-trace', 'matrix.json');

function loadMatrix() {
  if (!fs.existsSync(MATRIX_PATH)) {
    console.error(
      `Spec trace matrix not found at ${MATRIX_PATH}. Run "npm run spec:trace" first.`,
    );
    process.exit(1);
  }
  const raw = fs.readFileSync(MATRIX_PATH, 'utf8');
  return JSON.parse(raw);
}

function pct(numerator, denominator) {
  if (denominator === 0) return '100.0';
  return ((numerator / denominator) * 100).toFixed(1);
}

function formatReq(req) {
  const verify = normalizeVerify(req.verify);
  const verifySuffix = verify ? ` (verify=${verify})` : '';
  return `${req.id} — ${req.title}${verifySuffix}`;
}

function main() {
  const matrix = loadMatrix();
  const { testable, enforced, deferred } = classifyRequirements(matrix.requirements);

  const enforcedMissing = enforced.filter((r) => (r.tests?.length ?? 0) === 0);
  const deferredMissing = deferred.filter((r) => (r.tests?.length ?? 0) === 0);

  const enforcedCovered = enforced.length - enforcedMissing.length;
  const deferredCovered = deferred.length - deferredMissing.length;

  console.log('Spec coverage gate (SPEC.md ↔ tests)');
  console.log(
    `- Enforced (CI): ${enforced.length} | covered=${enforcedCovered} | missing=${enforcedMissing.length} | coverage=${pct(enforcedCovered, enforced.length)}%`,
  );
  console.log(
    `- Deferred (verify in: ${DEFAULT_DEFERRED_VERIFY.join(', ')}): ${deferred.length} | covered=${deferredCovered} | missing=${deferredMissing.length} | coverage=${pct(deferredCovered, deferred.length)}%`,
  );
  console.log(`- Testable total: ${testable.length}`);

  // Fail-safe against typos: unknown verify values are treated as ENFORCED,
  // and we warn loudly so people don’t assume they deferred something.
  const knownVerify = new Set([...DEFAULT_DEFERRED_VERIFY, 'ci']);
  const unknownVerify = testable
    .map((r) => ({ r, verify: normalizeVerify(r.verify) }))
    .filter(({ verify }) => verify && !knownVerify.has(verify));

  if (unknownVerify.length > 0) {
    console.warn('\nWarning: unknown verify= values found (treated as ENFORCED):');
    for (const { r, verify } of unknownVerify) {
      console.warn(`- ${r.id} — ${r.title} (verify=${verify})`);
    }
    console.warn(`\nAllowed deferred values: ${DEFAULT_DEFERRED_VERIFY.join(', ')}`);
    console.warn('If you want “not enforced yet”, use verify=todo.');
  }

  if (deferredMissing.length > 0) {
    console.warn('\nDeferred requirements without tests (does NOT fail CI):');
    for (const req of deferredMissing) {
      console.warn(`- ${formatReq(req)}`);
    }
    console.warn(
      '\nPromotion rule: remove verify=todo (or set verify=ci) AND add at least one test title starting with "<REQ-ID>: ".',
    );
  }

  if (enforcedMissing.length > 0) {
    console.error('\nSpec coverage check FAILED: enforced requirements without tests:');
    for (const req of enforcedMissing) {
      console.error(`- ${formatReq(req)}`);
    }
    console.error(
      '\nIf a requirement is intentionally not implemented/verified yet, mark it in SPEC.md as verify=todo so it is tracked but does not block CI.',
    );
    process.exit(1);
  }

  console.log('\nSpec coverage OK: all enforced requirements have referenced tests.');
}

main();
