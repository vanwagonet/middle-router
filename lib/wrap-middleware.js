'use strict'

var pathToRegexp = require('path-to-regexp')
var clone = require('./clone')

module.exports = function wrapMiddleware (matchPath, isRouter, middleware) {
  if (!matchPath || matchPath === '*') return middleware

  if (isRouter) matchPath = matchPath.replace(/\/+$/, '') + '/(.*)?'
  var keys = []
  var regex = pathToRegexp(matchPath, keys)

  return function (step) {
    var matches = regex.exec(decodeURIComponent(step.path))
    if (!matches) return

    if (isRouter) {
      step.path = '/' + (matches[matches.length - 1] || '').replace(/^\/+/, '')
    }

    var params = step.params = clone(step.params)
    for (var i = 1, ii = matches.length; i < ii; ++i) {
      var key = keys[i - 1]
      if (key) params[key.name] = matches[i]
    }

    return middleware(step)
  }
}
