import { join } from 'path';
import rimraf from 'rimraf';
import webpack from 'webpack';
import mergeCustomConfig from './mergeCustomConfig';
import getWebpackCommonConfig from './getWebpackCommonConfig';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

function getWebpackConfig(args) {
  let webpackConfig = getWebpackCommonConfig(args);

  webpackConfig.plugins = webpackConfig.plugins || [];

  // Config outputPath.
  if (args.outputPath) {
    webpackConfig.output.path = args.outputPath;
  }

  // Config if no --nocompress.
  if (!args.nocompress) {
    webpackConfig.plugins = [...webpackConfig.plugins,
      new webpack.optimize.UglifyJsPlugin({
        output: {
          ascii_only: true,
        },
      }),
    ];
  }

  webpackConfig.plugins = [...webpackConfig.plugins,
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ];

  // Output map.json if hash.
  if (args.hash) {
    webpackConfig.output.filename = webpackConfig.output.chunkFilename = '[name]-[chunkhash].js';
    webpackConfig.plugins = [...webpackConfig.plugins,
      require('map-json-webpack-plugin')({
        output: join(webpackConfig.output.path, 'map.json'),
      }),
    ];
  }

  webpackConfig = mergeCustomConfig(webpackConfig, join(args.cwd, args.config || 'webpack.config.js'));

  return webpackConfig;
}

export default function(args, callback) {
  args.cwd = args.cwd || process.cwd();

  // Get config.
  const webpackConfig = getWebpackConfig(args);

  // Clean output dir first.
  rimraf.sync(webpackConfig.output.path);

  function doneHandler(err, stats) {
    const { errors} = stats.toJson();
    if (errors && errors.length) {
      process.on('exit', function exitHandler() {
        process.exit(1);
      });
    }

    console.log(stats.toString({colors: true}));

    if (err) {
      process.on('exit', function exitHandler() {
        process.exit(1);
      });
      console.error(err);
    }
    if (callback) {
      callback(err);
    }
  }

  // Run compiler.
  const compiler = webpack(webpackConfig);
  if (args.watch) {
    compiler.watch(args.watch || 200, doneHandler);
  } else {
    compiler.run(doneHandler);
  }
}
