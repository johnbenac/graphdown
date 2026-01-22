"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMarkdownRecord = parseMarkdownRecord;
exports.serializeMarkdownRecord = serializeMarkdownRecord;
const frontMatter_1 = require("./frontMatter");
const errors_1 = require("../validate/errors");
const yaml_1 = require("./yaml");
function parseMarkdownRecord(text, file) {
    try {
        const { yaml, body } = (0, frontMatter_1.extractFrontMatter)(text);
        const yamlObj = (0, yaml_1.parseYamlObject)(yaml);
        return { ok: true, yaml: yamlObj, body };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const code = message.includes('Missing closing YAML front matter delimiter')
            ? 'E_FRONT_MATTER_UNTERMINATED'
            : message.includes('Missing YAML front matter delimiter')
                ? 'E_FRONT_MATTER_MISSING'
                : message === 'YAML front matter is not a valid object'
                    ? 'E_YAML_NOT_OBJECT'
                    : 'E_YAML_INVALID';
        return { ok: false, error: (0, errors_1.makeError)(code, message, file) };
    }
}
function serializeMarkdownRecord(input) {
    const yamlText = (0, yaml_1.stringifyYamlObject)(input.yaml);
    return (0, frontMatter_1.buildFrontMatter)(yamlText, input.body ?? '');
}
