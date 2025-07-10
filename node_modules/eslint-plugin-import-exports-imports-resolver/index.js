const path = require('path');
const fs = require('fs');
const { resolve: resolveExports } = require('resolve.exports');
const { resolve: resolveImports } = require('resolve.imports');
const { builtinModules } = require('module');

/**
 * @param {string} source - Module specifier, e.g. "package/foo", "#foo", or "./foo.js"
 * @param {string} file - The file that's trying to import the `source`
 * @param {Object} _config - config as configured in `index.js` under `settings`, see README for more info
 */
const resolve = (source, file, _config) => {
  if (_config?.alias) {
    for (const [pkg, options] of Object.entries(_config.alias)) {
      if (typeof options === 'string') {
        if (source.includes(pkg)) {
          // eslint-disable-next-line no-param-reassign
          source = options;
          break;
        }
      }

      if (typeof options === 'object') {
        if (source.includes(pkg) && file.includes(options.fromModuleDirectory)) {
          // eslint-disable-next-line no-param-reassign
          source = options.alias
          break;
        }
      }
    }
  }

  try {
    const moduleId = require.resolve(source, { paths: [path.dirname(file)] });

    if (builtinModules.includes(moduleId)) {
      return { found: false };
    }

    return { found: true, path: moduleId };
  } catch (err) {
    /** 
     * If the import wasn't resolved, we check to see if it's an import defined in 
     * the package.json `imports` field
     * 
     * Package imports always start with a "#" 
     */
    if (source.startsWith('#')) {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const resolved = resolveImports(packageJson, source);
        if (resolved) {
          return { found: true, path: resolved };
        }
      } catch (e) {
        /** Silently fail */
      }
    }

    if (err.code === 'MODULE_NOT_FOUND' && err.path?.endsWith('/package.json')) {
      const { name, module, main, exports } = require(err.path);
      const resolved = resolveExports({ name, module, main, exports }, source);
      const moduleId = path.join(path.dirname(err.path), resolved);

      return { found: true, path: moduleId };
    }

    return { found: false };
  }
};

module.exports = {
  interfaceVersion: 2,
  resolve,
};
