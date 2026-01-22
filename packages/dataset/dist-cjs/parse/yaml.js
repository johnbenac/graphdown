"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseYaml = parseYaml;
exports.parseYamlObject = parseYamlObject;
exports.stringifyYaml = stringifyYaml;
exports.stringifyYamlObject = stringifyYamlObject;
const yaml_1 = require("yaml");
function parseYaml(yamlString) {
    try {
        return (0, yaml_1.parse)(yamlString);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message);
    }
}
function parseYamlObject(yamlString) {
    const parsed = parseYaml(yamlString);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('YAML front matter is not a valid object');
    }
    return parsed;
}
function stringifyYaml(value) {
    try {
        return (0, yaml_1.stringify)(value);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message);
    }
}
function stringifyYamlObject(obj) {
    return stringifyYaml(obj).trimEnd();
}
