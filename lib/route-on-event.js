/* global window */
'use strict'

var win = typeof window === 'undefined' ? null : window

exports.routeFromLocation = function routeFromLocation (event, router) {
  router.route(win.location.href)
}

exports.routeFromLinkClick = function routeFromLinkClick (event, router) {
  setTimeout(() => {
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
  }, 0)
}
