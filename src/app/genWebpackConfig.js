"use strict";

var webpack = require('webpack');
var path = require('path');
const fs = require('fs');

var configurator = function (entry,output,ldr,brw) {  
    console.log("entry " + entry);
    console.log("output " + output);
    if (Array.isArray(entry)) entry.unshift('babel-polyfill');
    else entry = ['babel-polyfill', entry];
     
    var config = {
        entry,
        cache: true,
        output: {
            filename: output,
            path: __dirname 
        },
        module: {
            loaders: [   { test: /\.css$/, loader: "style!css-loader" }
                        ,{ test: /\.woff$/, loader: "url-loader" }
                        ,{ test: /\.ttf$/, loader: "url-loader" }
                        ,{ test: /\.svg$/, loader: "url-loader" }
                        ,{ test: /\.eot$/, loader: "url-loader" }
                        ,{ test: /\.png$/, loader: "url-loader" }
                        ,{ test: /\.json$/, loader: 'json-loader' }
                        /*,{ test: require.resolve("react"), loader: "expose?React" }     */
                        , ldr
            ]
        },
        resolve: {
            root: path.resolve(__dirname, '.'),
            extensions: ['', '.js', '.jsx']
        },
        node: {
            fs: "empty"
        }
    };

    if (brw) config.resolve.alias = { debug: path.resolve(__dirname, './node_modules/debug/browser.js' ) };
    else {
        var nodeModules = fs.readdirSync('node_modules')
                            .filter(function(x) {
                                 return ['.bin'].indexOf(x) === -1;
                            });
        config.externals = [
            function(context, request, callback) {
                var pathStart = request.split('/')[0];
                if (nodeModules.indexOf(pathStart) >= 0 && request != 'webpack/hot/signal.js') {
                    return callback(null, "commonjs " + request);
                };
                callback();
            }
        ];

        
        config.target = 'node';
        config.node = { __dirname: true, __filename: true, process: true };
        config.plugins = [
            new webpack.IgnorePlugin(/\.(css|less)$/),
            new webpack.BannerPlugin('require("source-map-support").install();', { raw: true, entryOnly: false }),
        ];
    }
    //config.devtool = 'cheap-module-eval-source-map';
    //config.devtool = 'source-map';
    config.devtool = 'sourcemap';
    config.debug = true;

    return config;
};

module.exports = configurator;