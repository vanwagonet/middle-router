var pathToRegexp = require('path-to-regexp')
var clone = require('./clone')

module.exports = function matchPath (path, isRouter, middleware) {
  if (isRouter) path = path.replace(/\/+$/, '') + '/(.*)?'
  var keys = []
  var regex = pathToRegexp(path, keys)

  return function (ctx, next, stop) {
    var matches = regex.exec(decodeURIComponent(ctx.path))
    if (!matches) return

    var subPath = ctx.path
    if (isRouter) {
      subPath = '/' + (matches[matches.length - 1] || '').replace(/^\/+/, '')
    }

    var params = clone(ctx.params)
    for (var i = 1, ii = matches.length; i < ii; ++i) {
      var key = keys[i - 1]
      if (key) params[key.name] = matches[i]
    }

    var subCtx = clone(ctx)
    subCtx.path = subPath
    subCtx.params = params

    return middleware(subCtx, next, stop)
  }
}
