const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  target: "web",

  entry: path.resolve(__dirname, "src/index.jsx"),

  output: {
    filename: "[name].js",
    chunkFilename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },

  module: {
    rules: [
      {
        test: /\.jsx|.js|.ts$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
    ],
  },

  devtool: 'cheap-module-source-map',

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src/index.html"),
    }),
  ],
};
