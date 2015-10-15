# Changelog

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

