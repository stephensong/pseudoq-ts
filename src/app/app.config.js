'use strict';

const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

module.exports = {
  context: __dirname,
  cache: true,
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      jquery: 'jquery'
    })
  ],
  entry: {
    app: "./index.tsx",
  },
  output: {
    path: path.resolve(__dirname, "../../assets"),
    filename: "pseudoq_bundl.js",
    publicPath: "/assets",
  },
  devServer: {
    contentBase: __dirname
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  devtool: "source-map",
  module: {
    rules:
      [ { test: /\.woff$/, loader: "url-loader" }
      , { test: /\.css$/, use: ["style-loader", "css-loader"] }
      , { test: /\.ttf$/, loader: "url-loader" }
      , { test: /\.svg$/, loader: "url-loader" }
      , { test: /\.eot$/, loader: "url-loader" }
      , { test: /\.png$/, loader: "url-loader" }
      , { test: /\.tsx?$/, loader: 'awesome-typescript-loader' }
      , { test: /\.jsx?$/, loader: 'awesome-typescript-loader' }
    ],
  },
  node: {
    fs: "empty"
  }

}



