const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');

//Variables////////////////////////////////////////////////////////////////////

const developmentBuildPath = path.resolve(__dirname, 'build')
const productionBuildPath = path.resolve(__dirname, 'dist')

const entries = {
    "triangle-patters": './triangle-patterns.js',
}

///////////////////////////////////////////////////////////////////////////////

module.exports = (env, argv) => {
    let outputPath;
    let optimization;

    if (argv.mode === 'production') {
        outputPath = productionBuildPath;
        optimization = {
            minimize: true,
            minimizer: ['...'],
        };
    } else {
        outputPath = developmentBuildPath;
        optimization = {};
    }

    ///////////////////////////////////////////////////////////////////////////

    //Configuring ESLint: https://eslint.org/docs/user-guide/configuring/
    const eslintConfiguration = {
        "env": {
            "browser": true,
            "es2020": true,
        },
        "parserOptions": {
            "ecmaVersion": 2020,
            "sourceType": "module",
        },
        "extends": "eslint:recommended",
        "rules": {},
    };

    //babel-preset-env configuration: https://babeljs.io/docs/en/babel-preset-env
    const babelPresetConfiguration = {
        "targets": "> 0.25%, not dead",
        "useBuiltIns": "entry",
        "corejs": "3.19",
    };

    ///////////////////////////////////////////////////////////////////////////

    const jsRule = {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
            loader: 'babel-loader',
            options: {
                presets: [
                    ['@babel/preset-env', babelPresetConfiguration],
                ],
            },
        },
    };

    ///////////////////////////////////////////////////////////////////////////

    return {
        mode: argv.mode === 'production' ? 'production' : 'development',

        entry: entries,

        output: {
            filename: '[name].js',
            path: outputPath,
        },

        plugins: [
            new webpack.ProgressPlugin(),
            new CleanWebpackPlugin(),
            new ESLintWebpackPlugin({overrideConfig: eslintConfiguration}),
        ],

        module: {
            rules: [
                jsRule,
            ],
        },

        devtool: 'source-map',
        optimization: optimization,
        performance: { hints: false },
        resolve: {},
    };
};
