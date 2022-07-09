const {join} = require('path')
const {
  addSideEffect,
  addDefault,
  addNamed
} = require('@babel/helper-module-imports')

function transCamel(_str, symbol) {
  const str = _str[0].toLowerCase() + _str.substr(1)
  return str.replace(/([A-Z])/g, $1 => `${symbol}${$1.toLowerCase()}`)
}

function winPath(path) {
  return path.replace(/\\/g, '/')
}

function normalizeCustomName(originCustomName) {
  // If set to a string, treat it as a JavaScript source file path.
  if (typeof originCustomName === 'string') {
    const customNameExports = require(originCustomName)
    return typeof customNameExports === 'function'
      ? customNameExports
      : customNameExports.default
  }

  return originCustomName
}

function getFile(path, state) {
  const file = (path && path.hub && path.hub.file) || (state && state.file)
  return file
}

module.exports = class Plugin {
  constructor(
    libraryName,
    libraryDirectory,
    style,
    styleLibraryDirectory,
    customStyleName,
    camel2DashComponentName,
    camel2UnderlineComponentName,
    fileName,
    customName,
    transformToDefaultImport,
    types,
    hintNamePrefix = '_',
    index = 0
  ) {
    this.libraryName = libraryName
    this.libraryDirectory =
      typeof libraryDirectory === 'undefined' ? 'lib' : libraryDirectory
    this.camel2DashComponentName =
      typeof camel2DashComponentName === 'undefined'
        ? true
        : camel2DashComponentName
    this.camel2UnderlineComponentName = camel2UnderlineComponentName
    this.style = style || false
    this.styleLibraryDirectory = styleLibraryDirectory
    this.customStyleName = normalizeCustomName(customStyleName)
    this.fileName = fileName || ''
    this.customName = normalizeCustomName(customName)
    this.transformToDefaultImport =
      typeof transformToDefaultImport === 'undefined'
        ? true
        : transformToDefaultImport
    this.types = types
    this.pluginStateKey = `importPluginState${index}`
    this.hintNamePrefix = hintNamePrefix
  }

  getPluginState(state) {
    if (!state[this.pluginStateKey]) {
      state[this.pluginStateKey] = {}
    }
    return state[this.pluginStateKey]
  }

  importMethod(methodName, file, pluginState) {
    if (!pluginState.selectedMethods[methodName]) {
      const {style, libraryDirectory} = this
      const transformedMethodName = this.camel2UnderlineComponentName
        ? transCamel(methodName, '_')
        : this.camel2DashComponentName
        ? transCamel(methodName, '-')
        : methodName

      let path = ''
      let transformToDefaultImport = this.transformToDefaultImport

      if (this.customName) {
        const result = this.customName(transformedMethodName, file)
        if (result.transformToDefaultImport != undefined) {
          transformToDefaultImport = result.transformToDefaultImport
        }
        path = winPath(result.path)
      } else {
        path = winPath(
          join(
            this.libraryName,
            libraryDirectory,
            transformedMethodName,
            this.fileName
          )
        )
      }

      if (transformToDefaultImport) {
        // e.g. import `hintName` from `path`
        pluginState.selectedMethods[methodName] = addDefault(file.path, path, {
          nameHint: `${this.hintNamePrefix}${methodName}`
        })
      } else {
        // e.g. import { `methodName` as `hintName` } from `path`
        pluginState.selectedMethods[methodName] = addNamed(
          file.path,
          methodName,
          path,
          {nameHint: `${this.hintNamePrefix}${methodName}`}
        )
      }

      if (this.customStyleName) {
        const stylePath = winPath(
          this.customStyleName(transformedMethodName, file)
        )
        addSideEffect(file.path, `${stylePath}`)
      } else if (this.styleLibraryDirectory) {
        const stylePath = winPath(
          join(
            this.libraryName,
            this.styleLibraryDirectory,
            transformedMethodName,
            this.fileName
          )
        )
        addSideEffect(file.path, `${stylePath}`)
      } else if (style === true) {
        addSideEffect(file.path, `${path}/style`)
      } else if (style === 'css') {
        addSideEffect(file.path, `${path}/style/css`)
      } else if (typeof style === 'function') {
        const stylePath = style(path, file)
        if (stylePath) {
          addSideEffect(file.path, stylePath)
        }
      }
    }

    return {...pluginState.selectedMethods[methodName]}
  }

  buildExpressionHandler(node, props, path, state) {
    const file = getFile(path, state)
    const {types} = this
    const pluginState = this.getPluginState(state)
    const returnData = []
    props.forEach(prop => {
      if (!types.isIdentifier(node[prop])) return
      if (
        pluginState.specified[node[prop].name] &&
        types.isImportSpecifier(path.scope.getBinding(node[prop].name).path)
      ) {
        const result = this.importMethod(
          pluginState.specified[node[prop].name],
          file,
          pluginState
        )
        if (result) {
          node[prop] = result
          returnData.push(result)
        }
      }
    })
    return returnData
  }

  buildDeclaratorHandler(node, prop, path, state) {
    const file = getFile(path, state)
    const {types} = this
    const pluginState = this.getPluginState(state)

    const checkScope = targetNode =>
      pluginState.specified[targetNode.name] &&
      path.scope.hasBinding(targetNode.name) &&
      path.scope.getBinding(targetNode.name).path.type === 'ImportSpecifier'

    if (types.isIdentifier(node[prop]) && checkScope(node[prop])) {
      const result = this.importMethod(
        pluginState.specified[node[prop].name],
        file,
        pluginState
      )
      if (result) {
        node[prop] = result
      }
    } else if (types.isSequenceExpression(node[prop])) {
      node[prop].expressions.forEach((expressionNode, index) => {
        if (types.isIdentifier(expressionNode) && checkScope(expressionNode)) {
          const result = this.importMethod(
            pluginState.specified[expressionNode.name],
            file,
            pluginState
          )
          if (result) {
            node[prop].expressions[index] = result
          }
        }
      })
    }
  }

  ProgramEnter(path, state) {
    const pluginState = this.getPluginState(state)
    pluginState.specified = Object.create(null)
    pluginState.libraryObjs = Object.create(null)
    pluginState.selectedMethods = Object.create(null)
    pluginState.pathsToRemove = []
  }

  ProgramExit(path, state) {
    this.getPluginState(state).pathsToRemove.forEach(p => {
      !p.removed && p.remove()
    })
  }

  ImportDeclaration(path, state) {
    const {node} = path

    // path maybe removed by prev instances.
    if (!node) return

    const {value} = node.source
    const {libraryName} = this
    const {types} = this
    const pluginState = this.getPluginState(state)
    // NOTE: 支持组件库内部调用组件的路径改写
    // if (value && value.includes(libraryName)) {
    //   console.log('value', value)
    // }
    if (value === libraryName) {
      node.specifiers.forEach(spec => {
        if (types.isImportSpecifier(spec)) {
          pluginState.specified[spec.local.name] = spec.imported.name
        } else {
          pluginState.libraryObjs[spec.local.name] = true
        }
      })

      pluginState.pathsToRemove.push(path)
    }
  }

  CallExpression(path, state) {
    const {node} = path
    const file = getFile(path, state)
    const {name} = node.callee
    const {types} = this
    const pluginState = this.getPluginState(state)

    if (types.isIdentifier(node.callee)) {
      if (pluginState.specified[name]) {
        const result = this.importMethod(
          pluginState.specified[name],
          file,
          pluginState
        )
        if (result) {
          node.callee = result
        }
      }
    }

    node.arguments = node.arguments.map(arg => {
      const {name: argName} = arg
      if (
        pluginState.specified[argName] &&
        path.scope.hasBinding(argName) &&
        path.scope.getBinding(argName).path.type === 'ImportSpecifier'
      ) {
        const result = this.importMethod(
          pluginState.specified[argName],
          file,
          pluginState
        )
        return result ? result : arg
      }
      return arg
    })
  }

  MemberExpression(path, state) {
    const {node} = path
    const file = getFile(path, state)
    const pluginState = this.getPluginState(state)

    // multiple instance check.
    if (!node.object || !node.object.name) return

    if (pluginState.libraryObjs[node.object.name]) {
      // antd.Button -> _Button
      path.replaceWith(this.importMethod(node.property.name, file, pluginState))
    } else if (
      pluginState.specified[node.object.name] &&
      path.scope.hasBinding(node.object.name)
    ) {
      const {scope} = path.scope.getBinding(node.object.name)
      // global variable in file scope
      if (scope.path.parent.type === 'File') {
        const result = this.importMethod(
          pluginState.specified[node.object.name],
          file,
          pluginState
        )
        if (result) {
          node.object = result
        }
      }
    }
  }

  Property(path, state) {
    const {node} = path
    this.buildDeclaratorHandler(node, 'value', path, state)
  }

  VariableDeclarator(path, state) {
    const {node} = path
    this.buildDeclaratorHandler(node, 'init', path, state)
  }

  ArrayExpression(path, state) {
    const {node} = path
    const props = node.elements.map((_, index) => index)
    this.buildExpressionHandler(node.elements, props, path, state)
  }

  LogicalExpression(path, state) {
    const {node} = path
    this.buildExpressionHandler(node, ['left', 'right'], path, state)
  }

  ConditionalExpression(path, state) {
    const {node} = path
    this.buildExpressionHandler(
      node,
      ['test', 'consequent', 'alternate'],
      path,
      state
    )
  }

  IfStatement(path, state) {
    const {node} = path
    this.buildExpressionHandler(node, ['test'], path, state)
    this.buildExpressionHandler(node.test, ['left', 'right'], path, state)
  }

  ExpressionStatement(path, state) {
    const {node} = path
    const {types} = this
    if (types.isAssignmentExpression(node.expression)) {
      this.buildExpressionHandler(node.expression, ['right'], path, state)
    }
  }

  ReturnStatement(path, state) {
    const {node} = path
    this.buildExpressionHandler(node, ['argument'], path, state)
  }

  ExportDefaultDeclaration(path, state) {
    const {node} = path
    const returnData = this.buildExpressionHandler(
      node,
      ['declaration'],
      path,
      state
    )
    const decl = path.get('declaration')

    // NOTE: https://github.com/babel/babel/pull/10302/commits/8d938afdd52d603e75341747a7b49e02c7fc8af1
    // register inserted declaration
    if (!decl.node.id && returnData.length > 0) {
      const file = getFile(path, state)
      path.scope.registerDeclaration(file.path.get('body.0'))
    }
  }

  BinaryExpression(path, state) {
    const {node} = path
    this.buildExpressionHandler(node, ['left', 'right'], path, state)
  }

  NewExpression(path, state) {
    const {node} = path
    this.buildExpressionHandler(node, ['callee'], path, state)

    const argumentsProps = node.arguments.map((_, index) => index)
    this.buildExpressionHandler(node.arguments, argumentsProps, path, state)
  }

  SwitchStatement(path, state) {
    const {node} = path
    this.buildExpressionHandler(node, ['discriminant'], path, state)
  }

  SwitchCase(path, state) {
    const {node} = path
    this.buildExpressionHandler(node, ['test'], path, state)
  }

  ClassDeclaration(path, state) {
    const {node} = path
    this.buildExpressionHandler(node, ['superClass'], path, state)
  }
}
