const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const babelRule = {
  test: /\.js$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env', '@babel/preset-react']
    }
  }
};

const scssRule = {
  test: /\.scss$/,
  use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
};

// Workflow builder bundle (bundles its own React). The CMS documentation
// bundle was extracted into silverstripeltd/silverstripe-cms-documentation.
const workflow = {
  entry: {
    bundle: './src/main.js',
    styles: './src/styles/workflow.scss'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  externals: {
    jquery: 'jQuery'
  },
  module: { rules: [babelRule, scssRule] },
  plugins: [new MiniCssExtractPlugin({ filename: 'styles.css' })]
};

module.exports = [workflow];
