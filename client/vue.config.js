
module.exports = {
   chainWebpack: config => {

    config.optimization.minimize(true);

    config.optimization.splitChunks({

      chunks:'all'

    })

},
  publicPath: process.env.NODE_ENV === 'production' ? '' : '/',
  devServer: {
    port: 3013
  },
}
