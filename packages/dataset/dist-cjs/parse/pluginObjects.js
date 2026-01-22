"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverPluginObjects = discoverPluginObjects;
const text_1 = require("../internal/text");
const pluginManifest_1 = require("./pluginManifest");
function isStringArray(value) {
    return Array.isArray(value) && value.every((x) => typeof x === 'string');
}
function discoverPluginObjects(snapshot) {
    const pluginManifestPaths = new Set();
    const pluginBundlePaths = new Set();
    const plugins = [];
    const paths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
    for (const path of paths) {
        const bytes = snapshot.files.get(path);
        if (!bytes)
            continue;
        // PLUG-LAYOUT-001 discovery (candidate manifests).
        if (!(0, pluginManifest_1.isPluginManifestCandidateBytes)(path, bytes)) {
            continue;
        }
        // Decode and parse (PLUG-FR-001).
        const decoded = (0, text_1.decodeUtf8Strict)(bytes);
        if (!decoded.ok) {
            // CandidateBytes already implies decode success; keep this defensive and skip.
            continue;
        }
        const parsed = (0, pluginManifest_1.parsePluginManifest)(decoded.text, path);
        if (!parsed.ok) {
            // CandidateBytes already implies parse success; keep defensive and skip.
            continue;
        }
        pluginManifestPaths.add(path);
        // Resolve bundle paths (PLUG-LAYOUT-002) when files[] is well-formed.
        const yaml = parsed.manifest.yaml;
        const files = yaml.files;
        let resolvedFiles = new Map();
        if (isStringArray(files)) {
            resolvedFiles = (0, pluginManifest_1.resolvePluginBundlePaths)(path, files);
            for (const resolvedPath of resolvedFiles.values()) {
                pluginBundlePaths.add(resolvedPath);
            }
        }
        plugins.push({ manifest: parsed.manifest, resolvedFiles });
    }
    // PLUG-UTIL-001: deterministic ordering rule.
    plugins.sort((a, b) => a.manifest.file.localeCompare(b.manifest.file));
    return { plugins, pluginManifestPaths, pluginBundlePaths };
}
