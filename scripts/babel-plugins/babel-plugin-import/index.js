const assert = require('assert');
const Plugin = require('./Plugin');

module.exports = function ({ types }) {
  let plugin = null;

  function applyInstance(method, args, context) {
    if (plugin[method]) {
      plugin[method].apply(plugin, [...args, context]);
    }
  }

  const Program = {
    enter(path, { opts = {} }) {
      // Init plugin instances once.
      assert(opts.libraryName, 'libraryName should be provided');
      plugin = new Plugin(
        opts.libraryName,
        opts.libraryDirectory,
        opts.style,
        opts.styleLibraryDirectory,
        opts.customStyleName,
        opts.camel2DashComponentName,
        opts.camel2UnderlineComponentName,
        opts.fileName,
        opts.customName,
        opts.transformToDefaultImport,
        types,
        opts.hintNamePrefix,
      );
      applyInstance('ProgramEnter', arguments, this);
    },
    exit() {
      applyInstance('ProgramExit', arguments, this);
    },
  };

  const methods = [
    'ImportDeclaration',
    'CallExpression',
    'MemberExpression',
    'Property',
    'VariableDeclarator',
    'ArrayExpression',
    'LogicalExpression',
    'ConditionalExpression',
    'IfStatement',
    'ExpressionStatement',
    'ReturnStatement',
    'ExportDefaultDeclaration',
    'BinaryExpression',
    'NewExpression',
    'ClassDeclaration',
    'SwitchStatement',
    'SwitchCase',
  ];

  const ret = {
    visitor: { Program },
  };

  for (const method of methods) {
    ret.visitor[method] = function () {
      applyInstance(method, arguments, ret.visitor);
    };
  }

  return ret;
};
