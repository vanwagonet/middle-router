/* global window */
var middleRun = require('middle-run')
var matchPath = require('./match-path')
var win = typeof window === 'undefined' ? null : window

function Router (options) {
  if (!(this instanceof Router)) return new Router(options)

  this.middleware = []
  this.onRoute = options && options.onRoute

  var hash = (options || {}).hash
  if (hash === true) hash = '#'
  this.hash = hash && hash[0] === '#' ? hash : false
  if (win && win.history && !win.history.pushState && !this.hash) {
    this.hash = '#'
  }
}

Router.prototype = {
  start: function start (opts) {
    var evtname = this.hash ? 'hashchange' : 'popstate'
    win.addEventListener(evtname, this, false)
    if (opts && opts.routeLinks) {
      win.document.addEventListener('click', this, false)
    }
    this.routeFromLocation()
    return this
  },

  stop: function start () {
    var evtname = this.hash ? 'hashchange' : 'popstate'
    win.removeEventListener(evtname, this, false)
    win.document.removeEventListener('click', this, false)
    return this
  },

  handleEvent: function handleEvent (event) {
    if (event.type === 'click') return this.routeFromLinkClick(event)
    return this.routeFromLocation(event)
  },

  routeFromLocation: function routeFromLocation () {
    var location = win.location
    var path = this.hash && location.hash ?
      location.hash.slice(this.hash.length) :
      location.pathname + location.search + location.hash
    this.route(path)
  },

  routeFromLinkClick: function routeFromLinkClick (event) {
    // ignore if it could open a new window, if a right click
    if (
      event.metaKey || event.shiftKey || event.ctrlKey || event.altKey ||
      event.which === 3 || event.button === 2
    ) return

    // ignore if not a link click
    var html = win.document.documentElement
    var target = event.target
    while (!target.href && target !== html) { target = target.parentNode }
    if (!target.href) return

    // ignore if not the same origin as the page
    var location = win.location
    var origin = location.origin || (location.protocol + '//' + location.host)
    if (target.href.slice(0, origin.length) !== origin) return

    event.preventDefault()
    var path = target.href.slice(origin.length)
    if (this.hash && path.indexOf(this.hash) >= 0) {
      path = path.slice(path.indexOf(this.hash) + this.hash.length)
    }
    this.go(path)
  },

  go: function go (url, state) {
    if (this.hash) {
      win.location.hash = this.hash + url // will trigger hashchange
    } else {
      win.history.pushState(state, win.document.title, url)
      this.route(url, state)
    }
  },

  replace: function replace (url, state) {
    if (this.hash) {
      win.location.hash = this.hash + url
    } else {
      win.history.replaceState(state, win.document.title, url)
    }
  },

  use: function use (path) {
    var callbacks = [].slice.call(arguments, 1)
    if (path && typeof path !== 'string') {
      callbacks.unshift(path)
      path = null
    }

    var middleware = this.middleware
    callbacks.forEach(function (fn) {
      var isRouter = fn instanceof Router
      if (isRouter) fn = middleRun(fn.middleware)
      if (path && path !== '*') fn = matchPath(path, isRouter, fn)
      middleware.push(fn)
    })

    return this
  },

  get: function get () {
    return this.use.apply(this, arguments)
  },

  run: function run (ctx, done) {
    var middleware = this.middleware.concat(done || [])
    return middleRun(middleware)(ctx)
  },

  route: function route (url, state) {
    var qIndex = url.indexOf('?')
    var path = qIndex === -1 ? url : url.slice(0, qIndex)
    var ctx = { url: url, path: path, params: {}, state: state }

    var promise = this.run(ctx, function () {
      console.error('no route matches ' + url)
    })

    if (this.onRoute) this.onRoute(promise)
    return promise
  },

  expressHandler: function expressHandler () {
    var self = this
    return function (req, res, next) {
      var ctx = {
        url: req.url,
        path: req.path,
        params: req.params,
        request: req,
        response: res
      }
      self.run(ctx, function () { next() }).catch(next)
    }
  }
}

module.exports = Router
