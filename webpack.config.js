const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure icon fonts are properly loaded
  config.module.rules.push({
    test: /\.ttf$/,
    loader: 'file-loader',
    include: [
      /node_modules\/react-native-vector-icons/,
      /node_modules\/@expo\/vector-icons/,
      /node_modules\/@expo\/vector-icons\/fonts/,
    ],
    options: {
      name: 'static/media/[name].[hash].[ext]',
      publicPath: '/',
    },
  });

  return config;
};