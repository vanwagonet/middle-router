var pathToRegexp = require('path-to-regexp')

function Route (path, route) {
  if (route.run) {
    this.router = route
    route = route.run.bind(route)
    if (path !== '*') {
      path = path.replace(/\/+$/, '') + '/*'
    }
  }
  this.path = path
  this.keys = []
  this.regex = pathToRegexp(path, this.keys)
  this.run = route
  this.isErrorHandler = route.length === 3
}

Route.prototype = {
  match: function match (ctx) {
    if (!this.path || this.path === '*') return ctx

    var matches = this.regex.exec(decodeURIComponent(ctx.path))
    if (!matches) return false

    var path = ctx.path
    if (this.router) {
      path = '/' + matches[matches.length - 1].replace(/^\/+/, '')
    }

    var params = Object.create(ctx.params)
    for (var i = 1, ii = matches.length; i < ii; ++i) {
      var key = this.keys[i - 1]
      if (key) params[key.name] = matches[i]
    }

    var context = Object.create(ctx)
    context.path = path
    context.params = params
    return context
  }
}

module.exports = Route
