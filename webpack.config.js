const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require('fs');

const DIR = '.dep-temp';

const deps = require("./package.json").dependencies;

const DefaultOrNamespaceSpecifier = 'DefaultOrNamespaceSpecifier';

const DESTINATION = path.resolve(process.cwd(), DIR, 'deps.json');

const ModuleFederationPlugin =
  require("webpack").container.ModuleFederationPlugin;

function getAntdMFShareDeps() {
  const version = deps['antd'] || '0.0.1';
  const results = [];
  if (fs.existsSync(DESTINATION)) {
    const fileData = fs.readFileSync(DESTINATION);
    if (fileData) {
      const resultMap = new Map(Object.entries(JSON.parse(fileData.toString())));
      resultMap.forEach((item,key) => {
        if (item === DefaultOrNamespaceSpecifier) {
          results.push({
            dep: key,
            requiredVersion: version,
          });
        }
      })
    }
  }

  return results;
}

function getShared(eager = false) {
  const shared = {};

  const ss = getAntdMFShareDeps();

  ss.forEach(s => {
    shared[s.dep] = {
      singleton: true,
      eager,
      requiredVersion: s.requiredVersion,
    }
  });

  console.log('ss', ss);

  const includeDeps = [
    "react",
    "react-dom",
  ];

  Object.keys(deps).forEach((dep) => {
    if (includeDeps.indexOf(dep) === -1) return;
    shared[dep] = {
      singleton: true,
      requiredVersion: deps[dep],
      eager,
    };
  });

  return shared;
}

module.exports = {
  target: "web",

  entry: {
    app: { import: path.resolve(process.cwd(), "src/index.jsx"), runtime: 'runtime' },
  },

  output: {
    filename: "[name].js",
    chunkFilename: "[name].js",
    path: path.resolve(process.cwd(), "dist"),
  },

  module: {
    rules: [
      {
        test: /\.jsx|.js|.ts$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          presets: [
            require.resolve('@babel/preset-env'),
            require.resolve('@babel/preset-react'),
          ],
          plugins: [
            require.resolve("@babel/plugin-syntax-dynamic-import"),

            [
              "import",
              { "libraryName": "antd", libraryDirectory: 'es'}
            ],
            [
              require.resolve('./scripts/babel-plugins/babel-plugin-singleton-search'),
              {
                deps: [{
                  name: 'antd',
                  version: deps['antd'],
                }],
                output: path.resolve(process.cwd(), DIR),
              }
            ]
          ]
        },

      },
    ],
  },

  devtool: "cheap-module-source-map",

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(process.cwd(), "src/index.html"),
    }),
    new ModuleFederationPlugin({
      name: "shell",
      runtime: "runtime",
      filename: "share.js",
      remotes: {},
      shared: [
        {
          ...getShared(),
        },
      ],
    }),
  ],
};
