/*
 * Dataset Validator
 *
 * This script validates the structure and contents of a Markdown‑canonical dataset.
 * It can be invoked via `node validateDataset.js <datasetRoot>` where <datasetRoot>
 * is either a local folder on disk or a GitHub repository URL.  For simplicity
 * of demonstration, only local directories are supported natively.  To
 * validate a remote GitHub repository you should clone or download it first
 * and then provide the local path as the argument.
 *
 * Validation rules are derived from the provided specification and are
 * documented in detail in the accompanying requirements document.  In brief,
 * every dataset must contain a single dataset record under `datasets/`, type
 * definitions in `types/`, and records organised under `records/<typeId>/`.
 * All files must be Markdown with YAML front matter that can be parsed into
 * a YAML object.  Required fields are enforced and IDs must be unique.
 */

const fs = require('fs');
const path = require('path');
const { extractFrontMatter, makeError, parseYamlObject } = require('./dist/core');


/**
 * Recursively list all Markdown files under a directory.
 *
 * @param {string} dir The directory to search
 * @returns {string[]} List of absolute file paths ending in `.md`
 */
function listMarkdownFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(listMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Read and parse a Markdown file, returning an object with YAML and body
 * fields.  Captures any errors encountered during parsing.
 *
 * @param {string} filePath The path to the Markdown file
 * @returns {{ yaml: object|null, body: string, error: string|null }}
 */
function readMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let yamlSection;
  let body;
  try {
    ({ yaml: yamlSection, body } = extractFrontMatter(content));
  } catch (err) {
    return { yaml: null, body: '', error: `Front matter error: ${err.message}` };
  }
  let yamlObj;
  try {
    yamlObj = parseYamlObject(yamlSection);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const errorText =
      message === 'YAML front matter is not a valid object'
        ? message
        : `YAML parse error: ${message}`;
    return { yaml: null, body, error: errorText };
  }
  return { yaml: yamlObj, body, error: null };
}

/**
 * Validate a dataset directory according to the specification.  Returns an
 * object with an array of error messages.  If the `errors` array is empty
 * then the dataset is considered valid.
 *
 * @param {string} root The root directory of the dataset
 * @returns {{ errors: string[] }}
 */
function validateDataset(root) {
  /** @type {import('./dist/core').ValidationError[]} */
  const errors = [];
  const messages = [];
  // Ensure required subdirectories exist
  const datasetsDir = path.join(root, 'datasets');
  const typesDir = path.join(root, 'types');
  const recordsDir = path.join(root, 'records');
  if (!fs.existsSync(datasetsDir) || !fs.statSync(datasetsDir).isDirectory()) {
    const message = 'Missing required `datasets/` directory';
    errors.push(makeError('E_DIR_MISSING', message, 'datasets/'));
    messages.push(message);
    return { errors, messages };
  }
  if (!fs.existsSync(typesDir) || !fs.statSync(typesDir).isDirectory()) {
    const message = 'Missing required `types/` directory';
    errors.push(makeError('E_DIR_MISSING', message, 'types/'));
    messages.push(message);
    return { errors, messages };
  }
  if (!fs.existsSync(recordsDir) || !fs.statSync(recordsDir).isDirectory()) {
    const message = 'Missing required `records/` directory';
    errors.push(makeError('E_DIR_MISSING', message, 'records/'));
    messages.push(message);
    return { errors, messages };
  }
  // Validate dataset record (exactly one .md file in datasets/)
  const datasetFiles = fs.readdirSync(datasetsDir).filter(fn => fn.toLowerCase().endsWith('.md'));
  if (datasetFiles.length !== 1) {
    const message = `Expected exactly one Markdown file in datasets/, found ${datasetFiles.length}`;
    errors.push(makeError('E_DATASET_FILE_COUNT', message, 'datasets/'));
    messages.push(message);
    return { errors, messages };
  }
  const datasetPath = path.join(datasetsDir, datasetFiles[0]);
  const datasetDoc = readMarkdownFile(datasetPath);
  if (datasetDoc.error) {
    const message = `Dataset file error in ${datasetFiles[0]}: ${datasetDoc.error}`;
    errors.push(makeError('E_YAML_INVALID', message, datasetFiles[0]));
    messages.push(message);
    return { errors, messages };
  }
  const datasetYaml = datasetDoc.yaml;
  // Validate required fields on dataset
  if (!datasetYaml.id || typeof datasetYaml.id !== 'string' || !datasetYaml.id.startsWith('dataset:')) {
    const message = 'Dataset id must be a string beginning with "dataset:"';
    errors.push(makeError('E_ID_PREFIX_INVALID', message, datasetFiles[0]));
    messages.push(message);
  }
  if (datasetYaml.datasetId !== datasetYaml.id) {
    const message = 'Dataset file datasetId must equal its id';
    errors.push(makeError('E_DATASET_ID_MISMATCH', message, datasetFiles[0]));
    messages.push(message);
  }
  if (datasetYaml.typeId !== 'sys:dataset') {
    const message = 'Dataset file typeId must be "sys:dataset"';
    errors.push(makeError('E_TYPEID_MISMATCH', message, datasetFiles[0]));
    messages.push(message);
  }
  // Required timestamp fields
  if (!datasetYaml.createdAt || !datasetYaml.updatedAt) {
    const message = 'Dataset file must have createdAt and updatedAt';
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', message, datasetFiles[0]));
    messages.push(message);
  }
  // Fields map validation
  if (!datasetYaml.fields || typeof datasetYaml.fields !== 'object') {
    const message = 'Dataset file fields must be an object';
    errors.push(makeError('E_REQUIRED_FIELD_MISSING', message, datasetFiles[0]));
    messages.push(message);
  } else {
    if (!datasetYaml.fields.name || !datasetYaml.fields.description) {
      const message = 'Dataset fields must include `name` and `description`';
      errors.push(makeError('E_DATASET_FIELDS_MISSING', message, datasetFiles[0]));
      messages.push(message);
    }
  }
  const datasetId = datasetYaml.id;
  // Gather type definitions
  const typeFiles = listMarkdownFiles(typesDir);
  const typeMap = new Map(); // recordTypeId -> type YAML
  const typeIds = new Set();
  for (const f of typeFiles) {
    const rel = path.relative(root, f);
    const doc = readMarkdownFile(f);
    if (doc.error) {
      const message = `Type file error in ${rel}: ${doc.error}`;
      errors.push(makeError('E_YAML_INVALID', message, rel));
      messages.push(message);
      continue;
    }
    const y = doc.yaml;
    if (!y.id || typeof y.id !== 'string' || !y.id.startsWith('type:')) {
      const message = `Type file ${rel} must have id beginning with "type:"`;
      errors.push(makeError('E_ID_PREFIX_INVALID', message, rel));
      messages.push(message);
      continue;
    }
    if (typeIds.has(y.id)) {
      const message = `Duplicate type id ${y.id}`;
      errors.push(makeError('E_DUPLICATE_ID', message, rel));
      messages.push(message);
    }
    typeIds.add(y.id);
    if (y.datasetId !== datasetId) {
      const message = `Type file ${rel} has datasetId ${y.datasetId} but dataset id is ${datasetId}`;
      errors.push(makeError('E_DATASET_ID_MISMATCH', message, rel));
      messages.push(message);
    }
    if (y.typeId !== 'sys:type') {
      const message = `Type file ${rel} typeId must be "sys:type"`;
      errors.push(makeError('E_TYPEID_MISMATCH', message, rel));
      messages.push(message);
    }
    if (!y.fields || typeof y.fields !== 'object') {
      const message = `Type file ${rel} fields must be an object`;
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', message, rel));
      messages.push(message);
      continue;
    }
    if (!y.fields.recordTypeId) {
      const message = `Type file ${rel} fields must include recordTypeId`;
      errors.push(makeError('E_REQUIRED_FIELD_MISSING', message, rel));
      messages.push(message);
      continue;
    }
    // Map recordTypeId to type YAML
    const recTypeId = y.fields.recordTypeId;
    if (typeMap.has(recTypeId)) {
      const message = `Multiple types define recordTypeId ${recTypeId}`;
      errors.push(makeError('E_DUPLICATE_RECORD_TYPE_ID', message, rel));
      messages.push(message);
    }
    typeMap.set(recTypeId, y);
  }
  // Validate record files
  const recordDirs = fs.readdirSync(recordsDir).filter(name => fs.statSync(path.join(recordsDir, name)).isDirectory());
  // All record directories should correspond to a known recordTypeId
  for (const dirName of recordDirs) {
    if (!typeMap.has(dirName)) {
      const message = `Unknown record type directory ${dirName}/ (no type definition for recordTypeId ${dirName})`;
      errors.push(makeError('E_UNKNOWN_RECORD_DIR', message, path.join('records', dirName)));
      messages.push(message);
    }
    const recFiles = listMarkdownFiles(path.join(recordsDir, dirName));
    for (const recPath of recFiles) {
      const rel = path.relative(root, recPath);
      const doc = readMarkdownFile(recPath);
      if (doc.error) {
        const message = `Record file error in ${rel}: ${doc.error}`;
        errors.push(makeError('E_YAML_INVALID', message, rel));
        messages.push(message);
        continue;
      }
      const y = doc.yaml;
      if (!y.id || typeof y.id !== 'string') {
        const message = `Record file ${rel} missing id or id not a string`;
        errors.push(makeError('E_REQUIRED_FIELD_MISSING', message, rel));
        messages.push(message);
      }
      if (y.datasetId !== datasetId) {
        const message = `Record file ${rel} datasetId mismatch: expected ${datasetId}, found ${y.datasetId}`;
        errors.push(makeError('E_DATASET_ID_MISMATCH', message, rel));
        messages.push(message);
      }
      if (y.typeId !== dirName) {
        const message = `Record file ${rel} typeId ${y.typeId} does not match its containing directory name ${dirName}`;
        errors.push(makeError('E_TYPEID_MISMATCH', message, rel));
        messages.push(message);
      }
      if (!y.createdAt || !y.updatedAt) {
        const message = `Record file ${rel} must have createdAt and updatedAt`;
        errors.push(makeError('E_REQUIRED_FIELD_MISSING', message, rel));
        messages.push(message);
      }
      if (!y.fields || typeof y.fields !== 'object') {
        const message = `Record file ${rel} fields must be an object`;
        errors.push(makeError('E_REQUIRED_FIELD_MISSING', message, rel));
        messages.push(message);
      }
    }
  }
  // Check for duplicate IDs across all files (dataset, types, records)
  const seenIds = new Set();
  function collectId(id, where) {
    if (seenIds.has(id)) {
      const message = `Duplicate id detected: ${id} (in ${where})`;
      errors.push(makeError('E_DUPLICATE_ID', message));
      messages.push(message);
    }
    seenIds.add(id);
  }
  if (datasetYaml.id) collectId(datasetYaml.id, 'dataset');
  for (const y of typeMap.values()) {
    if (y.id) collectId(y.id, 'type');
  }
  for (const dirName of recordDirs) {
    const recFiles = listMarkdownFiles(path.join(recordsDir, dirName));
    for (const recPath of recFiles) {
      const doc = readMarkdownFile(recPath);
      if (!doc.error && doc.yaml && doc.yaml.id) {
        collectId(doc.yaml.id, `record ${path.relative(root, recPath)}`);
      }
    }
  }
  return { errors, messages };
}

/**
 * CLI entry point.  Accepts a single argument specifying the dataset root.
 */
function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node validateDataset.js <datasetPath>');
    process.exit(1);
  }
  let rootPath = arg;
  // If the argument looks like a GitHub URL, instruct the user to clone it.
  const githubRe = /^https?:\/\/github\.com\//i;
  if (githubRe.test(arg)) {
    console.error('Validation of remote GitHub URLs is not supported by this script. Clone the repository locally and provide its path instead.');
    process.exit(1);
  }
  if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    console.error(`Dataset path ${rootPath} does not exist or is not a directory`);
    process.exit(1);
  }
  const result = validateDataset(rootPath);
  if (result.messages.length === 0) {
    console.log('Validation passed: dataset is valid.');
  } else {
    console.error('Validation failed with the following errors:');
    for (const err of result.messages) {
      console.error(' - ' + err);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
