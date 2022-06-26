const fs = require('fs');
const path = require('path');
const process = require('process');

const DefaultOrNamespaceSpecifier = 'DefaultOrNamespaceSpecifier';

const DIR = '.dep-temp';

const DESTINATION = path.resolve(process.cwd(), DIR, 'deps.json');

module.exports = function singletonSearch({types}) {
  let resultMap = new Map();

  function matching(dep, path) {
    const { value } = path.node.source;
    const specifiers = path.node.specifiers;
    if (value.startsWith(dep)) {
      specifiers.map(spec => {
        if (types.isImportSpecifier(spec)) {
          // e.g import { Card } from 'antd'
          const key = getKey(value, spec.imported.name);
          if (!resultMap.has(key)) {
            resultMap.set(key, {
              dep: value,
              importedName: spec.imported.name,
            });
          }
        } else if (types.isImportDefaultSpecifier(spec) || types.isImportNamespaceSpecifier(spec)) {
          // e.g import antd from 'antd' OR import * as antd from 'antd'
          if (!resultMap.has(value)) {
            resultMap.set(value, DefaultOrNamespaceSpecifier);
          }
        }
      });
    }
  }

  function getKey(dep, importedName) {
    return `${dep}-${importedName}`;
  }

  return {
    pre() {
      try {
        if (fs.existsSync(DESTINATION)) {
          const fileData = fs.readFileSync(DESTINATION);
          if (fileData) {
            resultMap = new Map(Object.entries(JSON.parse(fileData.toString())));
          }
        } else {
          fs.mkdirSync(path.resolve(process.cwd(), DIR));
        }
      } catch (error) {
        throw Error("pre error", error);
      }
    },
    visitor: {
      ImportDeclaration: {
        exit(path, { opts: { deps } }) {
          try {
            if (typeof deps === "string") {
              matching(deps, path);
            } else if (Array.isArray(deps)) {
              deps.forEach((dep) => {
                matching(dep, path);
              });
            } else {
              throw Error("error1");
            }

          } catch (error) {
            throw Error("error2", error);
          }
        },
      },
    },
    post() {
     try {
      const data = Object.fromEntries(resultMap);
      fs.writeFileSync(DESTINATION, JSON.stringify(data, null, 4));
     } catch (error) {
      throw new Error('post error', error);
     }
    }
  };
};
