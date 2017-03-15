/* global window */
'use strict'

var EventEmitter = require('eventemitter3')
var middleRun = require('middle-run')
var wrapMiddleware = require('./wrap-middleware')
var history = require('./history')
var parseUrl = typeof window === 'undefined'
  ? require('url').parse
  : require('./url').parse

var slice = Array.prototype.slice

function Router (options) {
  if (!(this instanceof Router)) return new Router(options)

  options = options || {}
  var hash = options.hash === true ? '#' : options.hash
  hash = (hash && hash.charAt(0) === '#') ? hash : false

  EventEmitter.call(this)

  this.middleware = []
  this.routing = null
  this.isListening = false
  this.unlisten = null
  this.hash = hash
  this.routeLinks = options.routeLinks !== false
  this.confirm = options.confirm
  this.context = options.context || {}

  this.stack = null
  this.stackIndex = -1
  this.onBeforeUnload = null
}

function method (fn) {
  return {
    configurable: true,
    enumerable: false,
    writable: true,
    value: fn
  }
}

function lazyLoad (step) {
  var self = this
  if (self.loaded) return self.fn(step)
  return Promise.resolve(self.fn(step)).then(function (fn) {
    if (fn instanceof Router) fn = middleRun(fn.middleware)
    self.loaded = true
    return (self.fn = fn)(step)
  })
}

Router.prototype = Object.create(EventEmitter.prototype, {

  start: method(function start () {
    if (this.isListening) this.stop() // remove previous listeners
    this.isListening = true
    this.unlisten = history.listen(this)
    return this.routing
  }),

  stop: method(function stop () {
    if (this.isListening) {
      this.isListening = false
      this.unlisten()
      this.unlisten = null
    }
    return this.routing
  }),

  navigate: method(function navigate (path, state, title) {
    return history.navigate(this, path, state, title)
  }),

  replace: method(function replace (path, state, title) {
    return history.replace(this, path, state, title)
  }),

  back: method(function back () {
    return history.back(this)
  }),

  forward: method(function forward () {
    return history.forward(this)
  }),

  use: method(function use (path) {
    var callbacks = slice.call(arguments, 1)
    if (path && typeof path !== 'string') {
      callbacks.unshift(path)
      path = null
    }

    var middleware = this.middleware
    callbacks.forEach(function (fn) {
      var isRouter = fn instanceof Router
      if (isRouter) fn = middleRun(fn.middleware)
      middleware.push(wrapMiddleware(path, isRouter, fn))
    })

    return this
  }),

  lazy: method(function lazy (path) {
    var callbacks = slice.call(arguments, 1)
    if (path && typeof path !== 'string') {
      callbacks.unshift(path)
      path = null
    }

    var middleware = this.middleware
    callbacks.forEach(function (fn) {
      fn = lazyLoad.bind({ fn: fn, loaded: false })
      middleware.push(wrapMiddleware(path, true, fn))
    })

    return this
  }),

  route: method(function route (path, state) {
    var self = this
    var exit
    var location = parseUrl(path, true)
    var args = {
      location: location,
      path: location.pathname,
      params: {},
      state: state,
      router: this,
      context: this.context,
      beforeExit: !this.isListening
        ? function () {}
        : history.listenBefore.bind(null, this)
    }

    if (this.isListening) {
      // only provide an exiting promise if listening for client url changes
      // `await exiting` is still safe, but immediately resolves to undefined
      args.exiting = new Promise(function (resolve) { exit = resolve })
    }

    // start asynchronously
    var promise = Promise.resolve(args)
      .then(middleRun(this.middleware))

    self.routing = promise
    function unsetRouting () { self.routing = null }
    promise.then(unsetRouting, unsetRouting)

    this.emit('beforeroute', args, promise)
    this.emit('route', args, promise)
    if (exit) this.once('route', exit)

    return promise
  }),

  expressHandler: method(function expressHandler () {
    var self = this
    return function (req, res, next) {
      self.once('beforeroute', function (args, routing) {
        args.request = req
        args.response = res
        args.params = req.params
        args.next = function () { next() } // discard arguments
        routing.catch(next)
      })
      self.route(req.url)
    }
  })
})

module.exports = Router
