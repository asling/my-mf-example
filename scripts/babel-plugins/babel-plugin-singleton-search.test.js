const pluginTester = require("babel-plugin-tester");
const path = require("path");
const singletonSearchPlugin = require("./babel-plugin-singleton-search");
const process = require("process");
const fs = require("fs");
const del = require("del");
const fse = require("fs-extra");

pluginTester.default({
  plugin: singletonSearchPlugin,

  pluginName: "singleton search",

  title: "normal cases",

  filename: __filename,

  snapshot: false,

  tests: [
    {
      title: "it should generate deps file",
      code: 'import { Card } from "antd"; ',
      pluginOptions: {
        deps: [{ name: "antd", version: "0.0.1" }],
        output: path.resolve(process.cwd(), ".test"),
      },
      teardown() {
        expect(fs.existsSync(process.cwd(), ".test_1", "deps.json")).toBe(true);
      },
    },
    {
      title:
        "it should generate deps.json in default path when no `output` of babel options",
      code: 'import { Card } from "antd"; ',
      pluginOptions: {
        deps: [{ name: "antd", version: "0.0.1" }],
      },
      teardown() {
        expect(fs.existsSync(process.cwd(), ".dep-temp", "deps.json")).toBe(
          true
        );
        return del(path.resolve(process.cwd(), ".dep-temp"));
      },
    },
    {
      title: "it should throw error when no `deps` of babel options",
      code: 'import { Card } from "antd"; ',
      pluginOptions: {
        output: path.resolve(process.cwd(), ".test"),
      },
      error: (err) => {
        if (err instanceof Error && /options error/.test(err.message)) {
          return true;
        }
        return false;
      },
    },
    {
      title: "it should generate deps.json when `output` is exist",
      code: 'import { Card } from "antd"; ',
      pluginOptions: {
        deps: [{ name: "antd", version: "0.0.1" }],
        output: path.resolve(process.cwd(), ".test_output_exist"),
      },
      setup: () => {
        fs.mkdirSync(path.resolve(process.cwd(), ".test_output_exist"));
      },
      teardown: () => {
        expect(
          fs.existsSync(process.cwd(), ".test_output_exist", "deps.json")
        ).toBe(true);
        return del(path.resolve(process.cwd(), ".test_output_exist"));
      },
    },
    {
      title: "it should throw error when `output` is a file path",
      code: 'import { Card } from "antd"; ',
      pluginOptions: {
        deps: [{ name: "antd", version: "0.0.1" }],
        output: path.resolve(process.cwd(), ".test_output_exist/test.txt"),
      },
      setup: () => {
        fse.outputFileSync(
          path.resolve(process.cwd(), ".test_output_exist/test.txt"),
          "123"
        );
      },
      error(err) {
        if (err instanceof Error && /post error/.test(err.message)) {
          return true;
        }
        return false;
      },
      teardown: () => {
        return del(path.resolve(process.cwd(), ".test_output_exist"));
      },
    },

    {
      title: "it should throw error when deps.json exist",
      code: 'import { Card } from "antd"; ',
      pluginOptions: {
        deps: [{ name: "antd", version: "0.0.1" }],
        output: path.resolve(process.cwd(), ".test_output_exist"),
      },
      setup: () => {
        fse.outputFileSync(
          path.resolve(process.cwd(), ".test_output_exist/deps.json"),
          ""
        );
      },
      error(err) {
        if (err instanceof Error && /prepare error/.test(err.message)) {
          return true;
        }
        return false;
      },
      teardown: () => {
        return del(path.resolve(process.cwd(), ".test_output_exist"));
      },
    },

    {
      title: "it should include DefaultSpecifier",
      code: 'import antd from "antd";',
      pluginOptions: {
        deps: [{ name: "antd", version: "0.0.1" }],
        output: path.resolve(process.cwd(), ".test"),
      },
      teardown: () => {
        const fileData = fse.readFileSync(
          path.resolve(process.cwd(), ".test", "deps.json")
        );
        const resultData = JSON.parse(fileData.toString());

        expect(resultData).toEqual({
          antd: {
            type: "DefaultOrNamespaceSpecifier",
            version: "0.0.1",
          },
        });
      },
    },
    {
      title: "it should include NamespaceSpecifier",
      code: 'import * as antd from "antd";',
      pluginOptions: {
        deps: [{ name: "antd", version: "0.0.1" }],
        output: path.resolve(process.cwd(), ".test"),
      },
      teardown: () => {
        const fileData = fse.readFileSync(
          path.resolve(process.cwd(), ".test", "deps.json")
        );
        const resultData = JSON.parse(fileData.toString());

        expect(resultData).toEqual({
          antd: {
            type: "DefaultOrNamespaceSpecifier",
            version: "0.0.1",
          },
        });
      },
    },
  ],

  teardown() {
    return del(path.resolve(process.cwd(), ".test"));
  },
});
