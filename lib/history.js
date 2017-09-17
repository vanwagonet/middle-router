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

function assertListening (router) {
  if (!router.isListening) {
    throw new Error('Router can only navigate if listening')
  }
}

exports.listenBefore = function listenBefore (router, callback, context) {
  // ensure no duplicate handler
  win.removeEventListener('beforeunload', router.onBeforeUnload, false)
  win.addEventListener('beforeunload', router.onBeforeUnload, false)
  router.on('beforeexit', function (event) {
    var returnValue = callback.call(context, event)
    if (typeof returnValue === 'string') {
      event.returnValue = returnValue
    }
  })
}

exports.listen = function listen (router) {
  if (!win) {
    router.isListening = false
    throw new Error('Can only listen for navigation events in a browser')
  }
  router.stack = [ '' ]
  router.stackIndex = 0
  router.onBeforeUnload = function (event) {
    // true if there were listeners
    if (router.emit('beforeexit', event)) {
      return event.returnValue
    }
  }

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
  if (!shouldNavigate(router)) return Promise.resolve()
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
  if (!shouldNavigate(router)) return Promise.resolve()
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
  assertListening(router)
  var popping = once('popstate')
  win.history.back()
  return popping.then(function () {
    return ignorePopState ? once('popstate') : null
  }).then(function () {
    return router.routing
  })
}

exports.forward = function forward (router) {
  assertListening(router)
  var popping = once('popstate')
  win.history.forward()
  return popping.then(function () {
    return ignorePopState ? once('popstate') : null
  }).then(function () {
    return router.routing
  })
}

function genKey () {
  return Math.random().toString(36).slice(2)
}

var ignorePopState = false
function didPopState (router, event) {
  var state = event.state || {}
  var index = router.stack.lastIndexOf(state.navigationKey)
  if (index < 0) index = 0 // assume unknown is start state
  var delta = router.stackIndex - index
  router.stackIndex = index
  // workaround weird IE11 bug that doesn't do hash state right
  if (router.hash && state.hash && !win.location.hash) {
    win.history.replaceState(state, win.document.title, state.hash)
  }

  if (ignorePopState) {
    ignorePopState = false
  } else if (shouldNavigate(router)) {
    var path = getPath(router, win.location.href)
    router.route(path, state)
  } else if (delta) {
    ignorePopState = true
    win.history.go(delta)
  }
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
  while (target && target.nodeName.toLowerCase() !== 'a' && target !== html) {
    target = target.parentNode
  }

  if (
    !target ||
    target.nodeName.toLowerCase() !== 'a' ||
    target.hasAttribute('target') ||
    target.hasAttribute('download') ||
    target.hasAttribute('rel')
  ) return

  // ignore if not the same origin as the page
  var location = win.location
  var origin = location.origin || (location.protocol + '//' + location.host)
  if (target.href.slice(0, origin.length) !== origin) return

  var path = getPath(router, target.href)

  event.preventDefault()
  router.navigate(path)
}

function shouldNavigate (router) {
  assertListening(router)
  if (!win) return true
  var event = {
    target: win.document,
    type: 'beforeexit',
    returnValue: null,
    preventDefault: function () {
      event.defaultPrevented = true
    }
  }
  router.emit('beforeexit', event)
  var defaultPrevented = event.defaultPrevented || (
    event.returnValue && typeof event.returnValue === 'string'
  )
  var confirm = router.confirm || win.confirm
  var confirmed = !defaultPrevented || confirm(event.returnValue || '')
  if (confirmed) {
    win.removeEventListener('beforeunload', router.onBeforeUnload, false)
    router.removeAllListeners('beforeexit')
  }
  return confirmed
}

function getPath (router, href) {
  var path = href
  var hash = router.hash
  if (hash && path.indexOf(hash) >= 0) {
    path = path.slice(path.indexOf(hash) + hash.length)
  }
  return path
}
