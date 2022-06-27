const fs = require("fs");
const path = require("path");
const process = require("process");

const Specifier = "Specifier";
const DefaultOrNamespaceSpecifier = "DefaultOrNamespaceSpecifier";

const DIR = path.resolve(process.cwd(), ".dep-temp");

const DESTINATION = path.resolve(DIR, "deps.json");

module.exports = function singletonSearch({ types }) {
  let resultMap = new Map();

  // 插件入参
  const pluginOptions = {
    destination: DESTINATION,
    dir: DIR,
  };

  function matching(dep, path) {
    const { value } = path.node.source;
    const specifiers = path.node.specifiers;
    const depName = dep.name;
    if (value.startsWith(depName)) {
      specifiers.map((spec) => {
        if (types.isImportSpecifier(spec)) {
          // e.g import { Card } from 'antd'
          const key = getKey(value, spec.imported.name);
          if (!resultMap.has(key)) {
            resultMap.set(key, {
              type: Specifier,
              dep: value,
              importedName: spec.imported.name,
              version: dep.version,
            });
          }
        } else if (
          types.isImportDefaultSpecifier(spec) ||
          types.isImportNamespaceSpecifier(spec)
        ) {
          // e.g import antd from 'antd' OR import * as antd from 'antd'
          if (!resultMap.has(value)) {
            resultMap.set(value, {
              type: DefaultOrNamespaceSpecifier,
              version: dep.version,
            });
          }
        }
      });
    }
  }

  function getKey(dep, importedName) {
    return `${dep}-${importedName}`;
  }

  function prepareFile() {
    try {
      if (!fs.existsSync(pluginOptions.dir)) fs.mkdirSync(pluginOptions.dir);
      if (fs.existsSync(pluginOptions.destination)) {
        const fileData = fs.readFileSync(pluginOptions.destination);
        if (fileData) {
          resultMap = new Map(Object.entries(JSON.parse(fileData.toString())));
        }
      }
    } catch (error) {
      console.error("prepare error", error);
    }
  }

  return {
    visitor: {
      Program: {
        enter(_, { opts: { output } }) {
          if (output) {
            pluginOptions.dir = output;
            pluginOptions.destination = path.resolve(output, "deps.json");
          }
          prepareFile();
        },
      },
      ImportDeclaration: {
        exit(path, { opts: { deps } }) {
          try {
            if (Array.isArray(deps)) {
              deps.forEach((dep) => {
                matching(dep, path);
              });
            } else {
              console.error("error1", '入参错误');
            }
          } catch (error) {
            console.error("error2", error);
          }
        },
      },
    },
    post() {
      try {
        const data = Object.fromEntries(resultMap);
        fs.writeFileSync(
          pluginOptions.destination,
          JSON.stringify(data, null, 4)
        );
      } catch (error) {
        console.error("post error", error);
      }
    },
  };
};
