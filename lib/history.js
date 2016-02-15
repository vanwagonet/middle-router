/* global window */
'use strict'

var win = typeof window === 'undefined' ? null : window

function once (eventname) {
  return new Promise(function (resolve) {
    win.addEventListener(eventname, function handle () {
      win.removeEventListener(eventname, handle, false)
      resolve()
    }, false)
  })
}

exports.listen = function listen (router) {
  router.stack = [ '' ]
  router.stackIndex = 0
  var path = getPath(router, win.location.href)
  exports.replace(router, path, win.history.state)
  router.route(path, win.history.state)

  var onpopstate = didPopState.bind(null, router)
  win.addEventListener('popstate', onpopstate, false)

  var onclick
  if (router.routeLinks) {
    onclick = didClick.bind(null, router)
    win.addEventListener('click', onclick, false)
  }

  return function () {
    win.removeEventListener('popstate', onpopstate, false)
    if (onclick) {
      win.removeEventListener('click', onclick, false)
    }
  }
}

exports.navigate = function navigate (router, path, state, title) {
  state = state || {}
  state.navigationKey = genKey()
  if (router.hash) state.hash = router.hash + path
  win.history.pushState(
    state,
    title || win.document.title,
    router.hash ? router.hash + path : path
  )
  router.stack[++router.stackIndex] = state.navigationKey
  router.stack.length = router.stackIndex + 1
  return router.route(path, state)
}

exports.replace = function replace (router, path, state, title) {
  state = state || {}
  state.navigationKey = genKey()
  if (router.hash) state.hash = router.hash + path
  win.history.replaceState(
    state,
    title || win.document.title,
    router.hash ? router.hash + path : path
  )
  router.stack[router.stackIndex] = state.navigationKey
}

exports.back = function back (router) {
  var popping = once('popstate')
  win.history.back()
  return popping.then(function () {
    return router.routing
  })
}

exports.forward = function forward (router) {
  var popping = once('popstate')
  win.history.forward()
  return popping.then(function () {
    return router.routing
  })
}

function genKey () {
  return Math.random().toString(36).slice(2)
}

function didPopState (router, event) {
  var state = event.state || {}
  var index = router.stack.lastIndexOf(state.navigationKey)
  if (index < 0) index = 0 // assume unknown is start state
  router.stackIndex = index
  // workaround weird IE11 bug that doesn't do hash state right
  if (router.hash && win.location.hash !== state.hash) {
    win.history.replaceState(state, win.document.title, state.hash)
  }
  var path = getPath(router, win.location.href)
  router.route(path, state)
}

function didClick (router, event) {
  // ignore if it could open a new window, if a right click
  if (
    event.metaKey || event.shiftKey || event.ctrlKey || event.altKey ||
    event.which === 3 || event.button === 2 || event.defaultPrevented
  ) return

  // ignore if not a link click
  var html = win.document.documentElement
  var target = event.target
  while (target && !target.href && target !== html) {
    target = target.parentNode
  }
  if (!target || !target.href) return

  // ignore if not the same origin as the page
  var location = win.location
  var origin = location.origin || (location.protocol + '//' + location.host)
  if (target.href.slice(0, origin.length) !== origin) return

  var path = getPath(router, target.href)

  event.preventDefault()
  router.navigate(path)
}

function getPath (router, href) {
  var path = href
  var hash = router.hash
  if (hash && path.indexOf(hash) >= 0) {
    path = path.slice(path.indexOf(hash) + hash.length)
  }
  return path
}
