# Changelog

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
