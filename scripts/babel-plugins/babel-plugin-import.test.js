const pluginTester = require("babel-plugin-tester");
const importPlugin = require("./babel-plugin-import");
const path = require("path");
const process = require("process");
const {readdirSync} = require('fs');
const prettier = require('prettier');

function getFixturePath(library, directory) {
  return path.resolve(process.cwd(), 'test', 'fixtures', library, directory, 'actual.js');
}

function getOutputFixturePath(library, directory) {
  return path.resolve(process.cwd(), 'test', 'fixtures', library, directory, 'expected.js');
}

function getTestCases(library, pluginOptions) {
  const fixturesDir = path.resolve(process.cwd(), 'test', 'fixtures', library);
  let fixtures = readdirSync(fixturesDir);
  fixtures = fixtures.filter(item => !item.includes('skip'));

  return fixtures.map(caseName => {
    const fixtureDir = path.resolve(fixturesDir, caseName);
    const actualFile = path.resolve(fixtureDir, 'actual.js');
    const expectedFile = path.resolve(fixtureDir, 'expected.js');
    return {
      fixture: actualFile,
      outputFixture: expectedFile,
      title: `should work with ${library} ${caseName.split('-').join(' ')}`,
      pluginOptions,
    };
  });
}

const adminComponentsLibraryName = "@yy/sl-admin-components";
const antdLibraryName = 'antd';

pluginTester.default({
  plugin: importPlugin,
  pluginName: "module import",
  title: "default cases",
  snapshot: false,
  formatResult: code => prettier.format(code, { parser: 'babel' }),
  pluginOptions: {
    libraryName: adminComponentsLibraryName,
    libraryDirectory: "es",
    camel2DashComponentName: false,
  },
  tests: [
    ...getTestCases(adminComponentsLibraryName),
    {
      pluginOptions: {
        libraryName: adminComponentsLibraryName,
        camel2DashComponentName: false,
        libraryDirectory: 'es',
        customName: (name) => {
          if (name === 'SLButton') {
            return {
              transformToDefaultImport: false,
              path: `${adminComponentsLibraryName}/es/SLButton`,
            }
          } else {
            return {
              path: `${adminComponentsLibraryName}/es/${name}`,
            }
          }

        },
      },
      title: 'it should work with keep named import',
      fixture: getFixturePath(adminComponentsLibraryName, 'get-correct-SLButton_skip'),
      outputFixture: getOutputFixturePath(adminComponentsLibraryName, 'get-correct-SLButton_skip'),
    },
    {
      pluginOptions: {
        libraryName: '@yy/sl-admin-components',
        camel2DashComponentName: false,
        libraryDirectory: 'es',
        customName: (name) => {
          if (name === 'SLButton') {
            return {
              transformToDefaultImport: false,
              path: '@yy/sl-admin-components/es/SLButton',
            }
          } else {
            return {
              path: `@yy/sl-admin-components/es/${name}`,
            }
          }

        },
      },
      title: 'it should work with keep named import',
      fixture: getFixturePath(adminComponentsLibraryName, 'member-expression_skip'),
      outputFixture: getOutputFixturePath(adminComponentsLibraryName, 'member-expression_skip'),
    },
    {
      title: 'it should work with import css',
      pluginOptions: {
        libraryName: adminComponentsLibraryName,
        libraryDirectory: 'es',
        camel2DashComponentName: false,
        style: true,
        customStyleName: (name) => {
          return `${adminComponentsLibraryName}/es/${name}/style`;
        }
      },
      fixture: getFixturePath(adminComponentsLibraryName, 'import-css_skip'),
      outputFixture: getOutputFixturePath(adminComponentsLibraryName, 'import-css_skip'),
    },
    ...getTestCases(antdLibraryName, {
      libraryName: antdLibraryName,
      libraryDirectory: "es",
      camel2DashComponentName: false,
    }),
  ],
});

