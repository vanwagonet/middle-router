# ![middle-router][logo] <br/> middle-router

> Route urls on both client and server through middleware.

[![npm Version][npm-image]][npm]
[![Build Status][build-image]][build]
[![JS Standard Style][style-image]][style]
[![MIT License][license-image]][LICENSE]

[![Dependency Status][deps-image]][deps]
[![Dev Dependency Status][dev-deps-image]][dev-deps]


Quick Start
-----------

`npm install middle-router --save` adds the library to `node_modules`. You can then use it as follows:

```js
// basic example
var Router = require('middle-router')

Router()
  // simple middleware can be synchronous
  .use(function (ctx) {
    ctx.state.foo = 'bar'
  })
  // true middleware by awaiting next()
  .use(async (ctx, next) => {
    let start = Date.now()
    await next()
    // all downstream matching routes/middleware have finished running
    ctx.state.totalMs = Date.now() - start
  })
  // Route url patterns
  .get('/page/:id', (ctx) => {
    ctx.path // /page/123
    ctx.params.id // 123
  })
  // Routers can be nested
  .get('/section', Router()
    .get('/page', function (ctx, next) {
      ctx.path // /page
    })
  )
  // trigger a route with optional state (used mostly server side)
  .route(url, { foo: 'bar' })
```

`middle-router` uses [`path-to-regexp`][path-to-regexp] to match paths, so it should behave much like express 4.x paths.


API
---

```typescript
class Router {
  /**
   * Start listening for hashchange/popstate events.
   * Immediately routes the current url.
   * @param {Object} [options] - Options for how the router will run.
   * @param {string|boolean} [options.hash] - true/false to enable/disable hash routing, string to specify a hash prefix like '#!/'.
   * @param {Function} [options.onRoute] - Called with the route promise each time routing begins. The promise resolves when routing completes.
   */
  start(options?: Object): Router;

  /**
   * Stop listening for hashchange/popstate events.
   */
  stop(): Router;

  /**
   * Update the current location and run the new route.
   * This is similar to location.assign() in terms of history.
   * @param {string} url - The new url to go to.
   * @param {Object} [state] - Optional state object to add to the context.
   */
  go(url: string, state?: Object): void;

  /**
   * Replace the current location and run the new route.
   * This is similar to location.replace() in terms of history.
   * @param {string} url - The new url to go replace the existing one.
   * @param {Object} [state] - Optional state object to add to the context.
   */
  replace(url: string, state?: Object): void;

  /**
   * Add the middleware functions to the list.
   * If path is specified, only execute the middleware when the url matches.
   * @param {string} [path] - The url path to match.
   * @param {Function[]} middleware - The middleware functions to execute when routing.
   */
  use(path?: string, ...middleware: Function[]): Router;

  /** alias for use */
  get(path?: string, ...middleware: Function[]): Router;

  /**
   * Run through the middleware for the url.
   * This is typically used on the server, and client uses start instead.
   * @param {string} url - The url to route for.
   * @param {Object} [state] - Optional state object to add to the context.
   */
  route(url: string, state?: Object): Promise;

  /**
   * Get a function to pass to express that mounts the Router.
   */
  expressHandler(): Function;
}
```

License
-------

This software is free to use under the MIT license. See the [LICENSE-MIT file][LICENSE] for license text and copyright information.


[logo]: https://cdn.rawgit.com/thetalecrafter/middle-router/612c9e9/logo.svg
[npm]: https://www.npmjs.org/package/middle-router
[npm-image]: https://img.shields.io/npm/v/middle-router.svg
[deps]: https://david-dm.org/thetalecrafter/middle-router
[deps-image]: https://img.shields.io/david/thetalecrafter/middle-router.svg
[dev-deps]: https://david-dm.org/thetalecrafter/middle-router#info=devDependencies
[dev-deps-image]: https://img.shields.io/david/dev/thetalecrafter/middle-router.svg
[build]: https://travis-ci.org/thetalecrafter/middle-router
[build-image]: https://img.shields.io/travis/thetalecrafter/middle-router.svg
[style]: https://github.com/feross/standard
[style-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[license-image]: https://img.shields.io/npm/l/middle-router.svg
[path-to-regexp]: https://github.com/pillarjs/path-to-regexp
[LICENSE]: https://github.com/thetalecrafter/middle-router/blob/master/LICENSE-MIT
