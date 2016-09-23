# Changelog

## 2.1.1

* **Bug Fix**
  * Make `lazy` always match just like routers

## 2.1.0

* **New Feature**
  * Added `lazy` for defining a route handler to be loaded on demand

## 2.0.2

* **Bug Fix**
  * Fixed bad routing for `download`, `target`, and `rel` containing links.

## 2.0.1

* **Bug Fix**
  * Fixed <img> tag being detected as a link when using routeLinks

## 2.0.0

* **New Feature**
  * Added `back` and `forward` methods for easy history manipulation
  * Added `beforeroute` event for manipulating the middleware arguments, so `route` event handlers can can assume the arguments are complete
  * Added `beforeExit` for registering handlers that can prevent navigation
* **Breaking Change**
  * Moved `routeLinks` option from `start` method to `Router` construction
  * Changed `routeLinks` to default to `true`, you must pass `routeLinks: false` to disable
  * Changed `start` and `stop` to return current `routing` promise
  * Removed redundant `get` method
  * Changes `navigate` to return a promise that resolves when finished routing the new path
  * Changed `replace` to return undefined, since no routing is performed
* **Internal**
  * Moved all event listening / client-only code to it's own file
  * Drop testing IE10
  * Add testing Safari 8 & 9

## 1.1.0

* **New Feature**
  * Added `router` to middleware args object, pointing to top-level Router instance
  * Added `routing` promise to top-level Router while running
* **Bug Fix**
  * Define properties like classes do, so they can be overwritten
  * Bind private `handleEvent` method to work around a jsdom bug
* **Internal**
  * Switch testing to mocha and power-assert
  * Use Firefox instead of PhantomJS for local testing
  * Drop node 0.10 in automated testing

## 1.0.2

* **Bug Fix**
  * Removed unnecessary link intercepting when using hash routing
  * Fixed bad routing of link clicks that had default prevented

## 1.0.0

* **Bug Fix**
  * Fixed hash routing query parameters
  * Improved hash routing support

## 0.2.0

* **New Feature**
  * Added a `location` object passed to middleware
  * Made routers event emitters and added a `'route'` event
  * Added an `exiting` promise passed to middleware
* **Breaking Change**
  * Removed `onRoute` option in `Route` constructor
  * Removed automatic fallback to hash routing when `pushState` is not supported
  * Renamed `go` to `navigate`

## 0.1.0

* **New Feature**
  * Async middleware and route handling via middle-run
  * Added onRoute option, called with the route promise each time route is invoked
  * Added expressHandler() to get an express-compatible handler to mount a router
* **Breaking Change**
  * browser.js is no longer built, consumers are expected to use browserify, webpack, rollup, etc
  * Router#route returns a promise that resolves when complete
  * Router#run returns a promise, and the function is added to the list of middleware run
  * Routes with a path create a new context with copied properties instead of inheriting from the previous context

## 0.0.4

* **Bug Fix**
  * Fixed nested routers

## 0.0.1

* **New Feature**
  * Middleware-based universal url routing
