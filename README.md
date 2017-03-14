# ![middle-router][logo]

[![npm Version][npm-image]][npm]
[![Greenkeeper badge](https://badges.greenkeeper.io/thetalecrafter/middle-router.svg)](https://greenkeeper.io/)
[![Build Status][build-image]][build]

[![MIT License][license-image]][LICENSE]
[![JS Standard Style][style-image]][style]

_Route urls through middleware functions on both client and server._

middle-router is a universal front-end router for routing urls changes through a series of async middleware functions. This allows you to perform multiple tasks when the url changes, instead of just updating the view.

`middle-router` uses [`path-to-regexp`][path-to-regexp] to match paths, so it should behave much like express 4.x paths.
It also uses [`middle-run`][middle-run] to run the middleware series.


Usage
-----

router.js
```js
import Router from 'middle-router'

export default Router()
  .use(async ({ context, next }) => {
    let start = Date.now()
    await next() // start next middleware, wait for control to return
    context.totalMs = Date.now() - start
  })

  .use('/accounts', Router()
    .use('/users/:userId', async ({ params, resolve, beforeExit, exiting }) => {
      setupListeners()
      beforeExit(event => {
        if (isFormDirty) return 'Are you sure you want to leave?'
      })

      resolve(UserView({ id: params.userId })) // yields control back upstream

      await exiting // only do this after resolve, or it won't resolve until next url change!!
      cleanupListeners()
    })
  )
```

server-client.js
```js
import router from './router.js'
import { Router } from 'express'
import ReactDOMServer from 'react-dom/server'

export default Router()
  .use(async (req, res, next) {
    try {
      let view = await router.route(req.url, res.locals.state)
      res.send(ReactDOMServer.renderToString(view))
    } catch (err) {
      next(err)
    }
  })
```

client.js
```js
import router from './router.js'
import ReactDOM from 'react-dom'

router
  .on('route', async (args, routing) => {
    try {
      let view = await routing
      ReactDOM.render(view, document.getElementById('view'))
    } catch (error) {
      ReactDOM.render(<Error error={error}/>, document.getElementById('view'))
    }
  })
  .start()
```

Note: _These usage examples use Express and React, and resolve each url to a React element. middle-router has no dependency on these, and can be used with whatever libraries you like._


API
---

Full API documentation is in the [GitHub Wiki][wiki]


Async Middleware
----------------

middle-router can work with any promised-based async middleware, but it was designed specifically for async functions. Inspired by [koa][koa]'s `yield next`, middle-router allows you to `await next()` so you can `next()` "downstream" and the `await` for control to flow back "upstream".


License
-------

This software is free to use under the MIT license. See the [LICENSE-MIT file][LICENSE] for license text and copyright information.


[logo]: https://cdn.rawgit.com/thetalecrafter/middle-router/f15320d/logo.svg
[npm]: https://www.npmjs.org/package/middle-router
[npm-image]: https://img.shields.io/npm/v/middle-router.svg
[build]: https://travis-ci.org/thetalecrafter/middle-router
[build-image]: https://img.shields.io/travis/thetalecrafter/middle-router.svg
[style]: https://github.com/feross/standard
[style-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[license-image]: https://img.shields.io/npm/l/middle-router.svg
[path-to-regexp]: https://github.com/pillarjs/path-to-regexp
[middle-run]: https://github.com/thetalecrafter/middle-run
[wiki]: https://github.com/thetalecrafter/middle-router/wiki/api
[koa]: http://koajs.com
[LICENSE]: https://github.com/thetalecrafter/middle-router/blob/master/LICENSE-MIT
