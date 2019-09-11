'use strict';

const fs = require('fs');
const path = require('path');
const filters = require('./filters');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const rootFolder = path.resolve(__dirname, '..', '..', 'browserscripts');
const log = require('intel').getLogger('browsertime');

const ScriptType = {
  PRE: 'pre',
  POST: 'post',
  COLLECT: 'collect'
};

function toFullPath(filename, root) {
  return path.join(root, filename);
}

/**
 * Read all JavaScript files in a specific dir. Will use the filename
 * without .js as the name of the script.
 * @param {*} dirpath
 */
async function scriptsFromDirectory(dirpath) {
  const dir = (await readdir(dirpath))
    .map(name => toFullPath(name, dirpath))
    .filter(await filters.onlyFiles)
    .filter(filters.onlyWithExtension('.js'));
  const result = {};
  for (const filepath of dir) {
    const name = path.basename(filepath, '.js');
    const script = await readFile(filepath, 'utf8');
    try {
      result[name] = generateScriptObject(name, filepath, script);
    } catch (e) {
      log.error('Could not parse user script ' + name + ': ' + e);
    }
  }
  return result;
}

async function getScriptsForCategories(categories) {
  const dirs = (await readdir(rootFolder))
    .filter(name => categories.find(n => n === name))
    .map(name => toFullPath(name, rootFolder))
    .filter(await filters.onlyDirectories);
  const result = {};
  for (const dir of dirs) {
    const name = path.basename(dir);
    const scripts = await scriptsFromDirectory(dir);
    result[name] = scripts;
  }
  return result;
}

/**
 * Take the name of a script, its location on the disk and its contents and
 * generate a script object:
 *
 * name: The name of the script.
 * function: A function object if this is a new-style script; null otherwise.
 * content: The source code of the function (contents) if this is a old-style
 *          script; null otherwise.
 * requires: An object with boolean fields indictating which requirements
 *           must be met to execute this new-style function; the object is empty
 *           for an old-style function.
 *
 * @param {string}
 * @param {string}
 * @param {string}
 * @returns {ScriptObject}
 */
function generateScriptObject(name, path, contents) {
  let scriptAndMetadataObject = undefined;
  try {
    scriptAndMetadataObject = require(path);
  } catch (error) {
    // Use this as a signal to fall back to an old-style script, but don't
    // perform any action
  }

  if (scriptAndMetadataObject) {
    if (
      typeof scriptAndMetadataObject.collect === 'function' &&
      typeof scriptAndMetadataObject.requires === 'object'
    ) {
      log.info(name + ' is a new-style script object.');
      if (
        (scriptAndMetadataObject.pre &&
          typeof scriptAndMetadataObject.pre !== 'function') ||
        (scriptAndMetadataObject.post &&
          typeof scriptAndMetadataObject.post !== 'function')
      ) {
        throw Error(
          "If defined, new-style script objects require 'pre'/'post' keys be functions."
        );
      }
      return {
        name: name,
        requires: scriptAndMetadataObject.requires,
        pre: scriptAndMetadataObject.pre,
        collect: scriptAndMetadataObject.collect,
        post: scriptAndMetadataObject.post,
        content: null
      };
    } else {
      throw Error(
        "New-style script object requires a function in the 'collect' key and an object in the 'requires' key."
      );
    }
  } else {
    if (log.isEnabledFor(log.TRACE)) {
      log.verbose(name + ' is an old-style script object.');
    }
    return {
      name: name,
      content: contents,
      function: null,
      pre: null,
      post: null,
      requires: {}
    };
  }
}

/**
 * Parse a file or directory, and return an object representing that groups scripts by category.
 * Single js files will be put into the category 'custom', for directories the category name will
 * be taken from the directory name.
 *
 * The resulting value looks like this:
 * <pre>
 * {
 *   'category': {
 *    'script': <contents of script.js>
 *   }
 * }
 * </pre>
 * @param {string} root a path to a js file, alternatively a directory containing js files.
 * @param {string} category a category to apply if a file is passed
 * @returns {Promise.<Object>}
 */
async function findAndParseScripts(root, category) {
  async function scriptsFromDirectory(dirpath) {
    const dir = (await readdir(dirpath))
      .map(name => toFullPath(name, dirpath))
      .filter(await filters.onlyFiles)
      .filter(filters.onlyWithExtension('.js'));
    const result = {};
    for (const filepath of dir) {
      const name = path.basename(filepath, '.js');
      const script = await readFile(filepath, 'utf8');

      try {
        result[name] = generateScriptObject(name, root, script);
      } catch (e) {
        log.error('Could not parse user script ' + name + ': ' + e);
      }
    }
    return result;
  }

  async function parseDirectory(dirPath) {
    const categoryName = path.basename(dirPath);

    return scriptsFromDirectory(dirPath).then(scripts => {
      const categories = {};
      categories[categoryName] = scripts;
      return categories;
    });
  }

  return stat(root).then(stats => {
    if (stats.isFile()) {
      return readFile(root, 'utf8').then(content => {
        const name = path.basename(root, '.js');
        let scripts = {};
        try {
          scripts[name] = generateScriptObject(name, root, content);
        } catch (e) {
          log.error('Could not parse user script ' + name + ': ' + e);
        }
        let categories = {};
        categories[category] = scripts;

        return categories;
      });
    } else {
      return parseDirectory(root);
    }
  });
}

module.exports = {
  defaultScriptCategories: ['browser', 'pageinfo', 'timings'],
  // FIXME need to add async here, is that possible for properties?
  get allScriptCategories() {
    return readdir(rootFolder).then(files => {
      files = files.map(fileName => path.join(rootFolder, fileName));
      const p = [];
      for (const file of files) {
        p.push(filters.onlyDirectories(file));
      }
      return Promise.all(p).then(isDirs => {
        const onlyDirs = [];
        for (let i = 0; i < isDirs.length; i++) {
          if (isDirs[i]) {
            onlyDirs.push(files[i]);
          }
        }
        return onlyDirs.map(dirName => path.basename(dirName));
      });
    });
  },
  getScriptsForCategories: getScriptsForCategories,
  findAndParseScripts: findAndParseScripts,
  ScriptType: ScriptType
};
