module.exports = async (app, defines = {}) => {
  const webpack = require('webpack')

  const serverConfig = await app.resolveWebpackConfig({ isServer: true })
  const clientConfig = await app.resolveWebpackConfig({ isClient: true }, config => {
    config
      .plugin('injections')
      .tap(args => {
        const definitions = args[0]
        args[0] = {
          ...definitions,
          ...defines
        }
        return args
      })
  })

  return new Promise((resolve, reject) => {
    webpack([clientConfig, serverConfig]).run((err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        const { errors } = stats.toJson()
        return reject(errors[0])
      }

      resolve(stats.toJson({ modules: false }))
    })
  })
}
