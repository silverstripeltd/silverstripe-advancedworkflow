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

// Existing workflow builder bundle — unchanged (bundles its own React).
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

// Isolated CMS documentation bundle. Reuses the admin's shared React,
// ReactDOM and Reactstrap (exposed as globals by silverstripe/admin) so the
// panel can use reactstrap's accessible Offcanvas without shipping its own
// copy of React. Kept in its own config so the workflow bundle is untouched
// and the whole feature stays extraction-ready.
const documentation = {
  entry: {
    documentation: './src/documentation/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  externals: {
    jquery: 'jQuery',
    react: 'React',
    'react-dom': 'ReactDom',
    reactstrap: 'Reactstrap'
  },
  module: { rules: [babelRule, scssRule] },
  plugins: [new MiniCssExtractPlugin({ filename: 'documentation.css' })]
};

module.exports = [workflow, documentation];
