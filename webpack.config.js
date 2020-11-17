const path = require("path");
const NodemonPlugin = require("nodemon-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/app.ts",
  target: "node",
  output: {
    filename: "app.dev.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "dist",
  },
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [new NodemonPlugin()],
};
