'use strict';

const DEFAULT_DEFERRED_VERIFY = Object.freeze([
  'todo',
  'backlog',
  'deferred',
  'future',
  'planned',
  'manual',
]);

function normalizeVerify(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isTestableRequirement(req) {
  return req && req.testable !== false;
}

// Deferred means: testable + verify explicitly in the deferred list.
// IMPORTANT: missing verify => NOT deferred => enforced by default.
function isDeferredRequirement(req, deferredVerify = DEFAULT_DEFERRED_VERIFY) {
  if (!isTestableRequirement(req)) return false;
  const verify = normalizeVerify(req.verify);
  if (!verify) return false;
  return deferredVerify.includes(verify);
}

function isEnforcedRequirement(req, deferredVerify = DEFAULT_DEFERRED_VERIFY) {
  return isTestableRequirement(req) && !isDeferredRequirement(req, deferredVerify);
}

function classifyRequirements(requirements, deferredVerify = DEFAULT_DEFERRED_VERIFY) {
  const testable = requirements.filter(isTestableRequirement);
  const enforced = [];
  const deferred = [];

  for (const req of testable) {
    if (isDeferredRequirement(req, deferredVerify)) deferred.push(req);
    else enforced.push(req);
  }

  return { testable, enforced, deferred, deferredVerify };
}

module.exports = {
  DEFAULT_DEFERRED_VERIFY,
  normalizeVerify,
  isTestableRequirement,
  isDeferredRequirement,
  isEnforcedRequirement,
  classifyRequirements,
};
