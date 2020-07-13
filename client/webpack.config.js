const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: [
    'webpack/hot/dev-server',
    './src',
  ],
  output: {
    path: path.join(__dirname, 'dist/'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'eslint-loader',
      },
      {
        test: /\.tsx?$/,
        exclude: [/(node_modules|bower_components)/],
        use: [{
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
            ],
          },
        }, {
          loader: 'ts-loader',
        }],
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
          },
        ],
      },
      {
        test: /\.s[ca]ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
  devServer: {
    host: '0.0.0.0',
    allowedHosts: [
      '127.0.0.1',
      'lvh.me',
      'www.lvh.me',
      '192.168.1.5',
      '192.168.1.3',
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.API_BASE_URL': JSON.stringify('https://api.poo.email/api'),
      'process.env.EVENT_GATEWAY_ENDPOINT': JSON.stringify('wss://events.poo.email/prod'),
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/index.ejs',
    }),
    new webpack.HotModuleReplacementPlugin(),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: path.join(__dirname, 'reports/webpack-bundle-analysis.html'),
      openAnalyzer: false,
    }),
  ],
};
