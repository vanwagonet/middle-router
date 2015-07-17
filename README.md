# ![middle-router][logo] <br/> middle-router

> Route urls on both client and server through middleware.

[![npm Version][npm-image]][npm]
[![Dependency Status][deps-image]][deps]
[![Dev Dependency Status][dev-deps-image]][dev-deps]
[![Build Status][build-image]][build]

[![JS Standard Style][style-image]][style]
[![MIT License][license-image]][LICENSE]


Quick Start
-----------

`npm install middle-router --save` adds the library to `node_modules`. You can then use it as follows:

```js
// basic example
var Router = require('middle-router')

Router()
  .use(function (ctx, next) {
    // general middleware
    ctx.state.foo // bar
    next()
  })
  // Route url patterns
  .get('/page/:id', function (ctx, next) {
    ctx.path // /page/123
    ctx.params.id // 123
  })
  // Routers can be nested
  .get('/section', Router()
    .get('/page', function (ctx, next) {
      ctx.path // /page
    })
  )
  // trigger a route (used mostly server side)
  .route(url, { foo: 'bar' })
```

`middle-router` uses [`path-to-regexp`][path-to-regexp] to match paths, so it behaves just like express 4.x paths.


TODO
----

- Add a way to directly mount a middle-router in express.


Future Ideas
------------

- Allow use of promises instead of calling `next`.
- Allow middleware to return (or resolve) a function to be called once the url is handled.


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
