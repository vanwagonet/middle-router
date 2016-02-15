/* global window */
'use strict'

var EventEmitter = require('eventemitter3')
var middleRun = require('middle-run')
var wrapMiddleware = require('./wrap-middleware')
var parseUrl = require('./parse-url')
var handler = require('./route-on-event')

var win = typeof window === 'undefined' ? null : window
function method (fn) {
  return {
    configurable: true,
    enumerable: false,
    writable: true,
    value: fn
  }
}

function Router (options) {
  if (!(this instanceof Router)) return new Router(options)

  EventEmitter.call(this)

  // bind handleEvent since jsdom doesn't use the right `this`
  // https://github.com/tmpvar/jsdom/issues/1382
  Object.defineProperty(this, 'handleEvent', method(this.handleEvent.bind(this)))

  this.middleware = []
  this.isListening = false
  this.routing = null

  options = options || {}
  var hash = options.hash === true ? '#' : options.hash
  this.hash = hash && hash.charAt(0) === '#' ? hash : false
}

Router.prototype = Object.create(EventEmitter.prototype, {

  start: method(function start (opts) {
    if (this.isListening) this.stop() // remove listeners from previous options
    var evtname = this.hash ? 'hashchange' : 'popstate'
    win.addEventListener(evtname, this, false)
    if (opts && opts.routeLinks && !this.hash) {
      win.document.addEventListener('click', this, false)
    }
    this.isListening = true
    handler.routeFromLocation(null, this)
    return this
  }),

  stop: method(function stop () {
    var evtname = this.hash ? 'hashchange' : 'popstate'
    win.removeEventListener(evtname, this, false)
    win.document.removeEventListener('click', this, false)
    this.isListening = false
    return this
  }),

  handleEvent: method(function handleEvent (event) {
    if (event.type === 'click') return handler.routeFromLinkClick(event, this)
    return handler.routeFromLocation(event, this)
  }),

  navigate: method(function navigate (path, state, title) {
    if (this.hash) {
      win.location.hash = this.hash + path // will trigger hashchange
    } else {
      win.history.pushState(state, title || win.document.title, path)
      this.route(path, state)
    }
    return this
  }),

  replace: method(function replace (path, state, title) {
    if (this.hash) {
      win.location.replace(
        win.location.href.replace(/#.*$/, '')
        + this.hash + path
      )
    } else {
      win.history.replaceState(state, title || win.document.title, path)
    }
    return this
  }),

  use: method(function use (path) {
    var callbacks = [].slice.call(arguments, 1)
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

  get: method(function get () {
    return this.use.apply(this, arguments)
  }),

  route: method(function route (url, state) {
    var self = this
    var exit
    var isHashRouting = Boolean(this.hash)
    var location = parseUrl(url, {
      shouldParseQs: true,
      isHashRouting: isHashRouting,
      hashPrefix: this.hash
    })
    var args = {
      location: location,
      path: location.pathname,
      params: {},
      state: state,
      router: this,
      context: {},
      next: function () {
        console.error('no route matches ' + args.path)
      }
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

    this.emit('route', args, promise)
    if (exit) this.once('route', exit)

    return promise
  }),

  expressHandler: method(function expressHandler () {
    var self = this
    return function (req, res, next) {
      var args = {
        location: parseUrl(req.url, true),
        path: req.path,
        params: req.params,
        request: req,
        response: res,
        router: self,
        context: {},
        next: function () { next() } // discard arguments
      }
      var promise = Promise.resolve(args)
        .then(middleRun(self.middleware))

      self.routing = promise
      function unsetRouting () { self.routing = null }
      promise.then(unsetRouting, unsetRouting)

      promise.catch(next)
      self.emit('route', args, promise)
    }
  })
})

module.exports = Router
