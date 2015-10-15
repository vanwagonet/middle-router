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
___

```typescript
class Router {
  // start listening for hashchange/popstate events
  // also immediately routes the current url
  start(options?: Object): Router;

  // stop listening for hashchange/popstate events
  stop(): Router;

  // update the current location and run the new route
  go(url: string, state?: Object): void;

  // replace the current location and run the new route
  replace(url: string, state?: Object): void;

  // add the middleware functions to the list
  // if path is specified, only execute the middleware when the url matches
  use(path?: string, ...middleware: Function[]): Router;

  // alias for use
  get(path?: string, ...middleware: Function[]): Router;

  // run through the list of middleware with the specified context
  // if done is passed in, run it at the end of the middleware list
  run(context?: Object, done?: Function): Promise;

  // run through the middleware for the url
  route(url: string, state?: Object): Promise;

  // get a function to mount the Router as an express middleware
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
