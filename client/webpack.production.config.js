/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
/* eslint-enable import/no-extraneous-dependencies */

module.exports = {
  mode: 'production',
  bail: true,
  devtool: 'source-map',
  entry: './src',
  output: {
    path: path.join(__dirname, 'dist/'),
    publicPath: '/',
    filename: 'static/bundle-[contentHash].js',
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
              ['@babel/preset-env', {
                targets: '> 0.5%, last 2 versions, Firefox ESR, not dead, ie 11',
                useBuiltIns: 'usage',
                corejs: 3,
              }],
              '@babel/preset-react',
            ],
            plugins: [
              ['@babel/plugin-transform-runtime', {
                corejs: 3,
              }],
            ],
            sourceType: 'script',
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
  optimization: {
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
      }),
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.API_BASE_URL': JSON.stringify('https://api.poo.email/api'),
      'process.env.EVENT_GATEWAY_ENDPOINT': JSON.stringify('wss://events.poo.email/prod'),
      'process.env.GA_MEASUREMENT_ID': JSON.stringify('UA-172919993-1'),
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: 'static/[name]-[contentHash].css',
      chunkFilename: 'static/[id]-[contentHash].css',
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/index.ejs',
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: path.join(__dirname, 'reports/webpack-bundle-analysis.html'),
      openAnalyzer: false,
    }),
  ],
};
