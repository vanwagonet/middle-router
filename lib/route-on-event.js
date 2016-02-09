/* global window */
'use strict'

var win = typeof window === 'undefined' ? null : window

exports.routeFromLocation = function routeFromLocation (event, router) {
  var state = (event && event.type === 'popstate') ? event.state : win.history.state
  router.route(win.location.href, state)
}

exports.routeFromLinkClick = function routeFromLinkClick (event, router) {
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

  event.preventDefault()
  var path = target.href.slice(origin.length)
  var hash = router.hash
  if (hash && path.indexOf(hash) >= 0) {
    path = path.slice(path.indexOf(hash) + hash.length)
  }
  router.navigate(path)
}

exports.registerBeforeExit = function (router, callback, context) {
  // ensure no duplicate handler
  win.removeEventListener('beforeunload', router, false)
  win.addEventListener('beforeunload', router, false)
  router.on('beforeexit', function (event) {
    var returnValue = callback.call(context, event)
    if (typeof returnValue === 'string') {
      event.returnValue = returnValue
    }
  })
}

exports.beforeUnload = function (event, router) {
  // true if there were listeners
  if (router.emit('beforeexit', event)) {
    return event.returnValue
  }
}

exports.shouldNavigate = function (router) {
  if (!win || !router.isListening) return true
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
  var confirmed = !defaultPrevented || router.confirm(event.returnValue || '')
  if (confirmed) {
    win.removeEventListener('beforeunload', router, false)
    router.removeAllListeners('beforeexit')
  }
  return confirmed
}

exports.shouldRoute = function (router, location) {
  if (!win || !router.isListening) return true

  var entries = router.entries ||
    (router.entries = { list: [], index: -1, length: -1 })
  var index = entries.index + 1
  var isNewEntry = entries.length !== win.history.length
  if (!isNewEntry) {
    index = entries.list.lastIndexOf(location.href)
    if (index === -1) {
      index = entries.index + 1
      isNewEntry = true
    }
  }
  var delta = entries.index - index
  entries.list[(entries.index = index)] = location.href
  entries.length = win.history.length
  if (isNewEntry) entries.list.length = index + 1

  if (exports.shouldNavigate(router)) return true
  if (delta) win.history.go(delta)
  return false
}
