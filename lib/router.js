/* global window */
'use strict'

var EventEmitter = require('eventemitter3')
var middleRun = require('middle-run')
var wrapMiddleware = require('./wrap-middleware')
var parseUrl = require('./parse-url')
var handler = require('./route-on-event')

var win = typeof window === 'undefined' ? null : window
function method (fn) { return { enumerable: false, value: fn } }

/**
 * Creates a new Router. The new keyword is optional.
 *
 * @class
 * @param {Object} [options] Options for how the router will run
 * @param {string|boolean} [options.hash=false] true/false to enable/disable hash routing, string to specify a hash prefix like '#!'.
 */
function Router (options) {
  if (!(this instanceof Router)) return new Router(options)

  EventEmitter.call(this)

  this.middleware = []
  this.isListening = false
  this.routing = null

  options = options || {}
  var hash = options.hash === true ? '#' : options.hash
  this.hash = hash && hash.charAt(0) === '#' ? hash : false
}

/**
 * Route event. This is emitted every time the middleware starts running.
 *
 * @event Router#route
 * @param {Object} args Argument passed to the top-level middleware.
 * @param {Promise} routing Promise that resolves when the full middleware series completes.
 */

Router.prototype = Object.create(EventEmitter.prototype, {

  /**
   * Start listening for hashchange/popstate events.
   * Immediately routes the current url.
   *
   * @param {Object} [options] Options for how the router will run.
   * @param {boolean} [options.routeLinks=false] true/false to enable/disable listening to link clicks, and handling with navigate.
   * @emits Router#route
   * @returns {Router} this
   */
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

  /**
   * Stop listening for hashchange/popstate events.
   *
   * @returns {Router} this
   */
  stop: method(function stop () {
    var evtname = this.hash ? 'hashchange' : 'popstate'
    win.removeEventListener(evtname, this, false)
    win.document.removeEventListener('click', this, false)
    this.isListening = false
    return this
  }),

  /** @private */
  handleEvent: method(function handleEvent (event) {
    if (event.type === 'click') return handler.routeFromLinkClick(event, this)
    return handler.routeFromLocation(event, this)
  }),

  /**
   * Update the current location and run the new route.
   * This is similar to location.assign() in terms of history.
   *
   * @param {string} url The new url to go to.
   * @param {Object} [state] Optional state object to add to the context.
   * @returns {Router} this
   */
  navigate: method(function navigate (path, state, title) {
    if (this.hash) {
      win.location.hash = this.hash + path // will trigger hashchange
    } else {
      win.history.pushState(state, title || win.document.title, path)
      this.route(path, state)
    }
    return this
  }),

  /**
   * Replace the current location and run the new route.
   * This is similar to location.replace() in terms of history.
   *
   * @param {string} url The new url to go replace the existing one.
   * @param {Object} [state] Optional state object to add to the context.
   * @returns {Router} this
   */
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

  /**
   * Add the middleware functions to the list.
   * If path is specified, only execute the middleware when the url matches.
   *
   * @param {string} [path] The url path to match.
   * @param {Function[]} middleware The middleware functions to execute when routing.
   * @returns {Router} this
   */
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

  /**
   * Since this is a front-end focused router all routes are GET,
   * so use and get are interchangable.
   */
  get: method(function get () {
    return this.use.apply(this, arguments)
  }),

  /**
   * Run through the middleware for the url.
   * This is typically used on the server, and client uses start instead.
   *
   * @param {string} url The url to route for.
   * @param {Object} [state] Optional state object to add to the context.
   * @emits Router#route
   * @returns {Promise} Promise that resolves when the whole middleware series completes.
   */
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

  /**
   * Get a function to pass to express that mounts the Router.
   *
   * @returns {Function} An express middleware-compatible function.
   */
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
