# ![middle-router][logo] <br/> middle-router

> Route urls on both client and server through middleware functions.

[![npm Version][npm-image]][npm]
[![Build Status][build-image]][build]

[![JS Standard Style][style-image]][style]
[![MIT License][license-image]][LICENSE]

middle-router is a universal front-end router that routes urls through a series of async middleware functions. This allows you to perform multiple tasks when the url changes, instead of just updating the view.

`middle-router` uses [`path-to-regexp`][path-to-regexp] to match paths, so it should behave much like express 4.x paths.
It also uses [`middle-run`][middle-run] to run the middleware series.


Quick Example
-------------

This example resolves to a React element, and then renders it. You do not need to follow this pattern in your own code. You can resolve to any value you like.

```js
// basic example
import Router from 'middle-router'

let router = Router()
  // simple middleware can be synchronous
  .use(function (step) {
    step.context.foo = 'bar' // context carries on to each subsequent function
  })
  // true middleware by awaiting next()
  .use(async ({ context, next }) => {
    let start = Date.now()
    await next()
    // all downstream matching routes/middleware have finished running
    context.totalMs = Date.now() - start
  })
  // Route url patterns
  .get('/page/:id', ({ path, params }) => {
    path // /page/123
    params.id // 123
  })
  // beforeExit registration
  .get('/form', ({ beforeExit }) => {
    beforeExit(event => {
      if (isFormDirty) return 'Are you sure you want to leave?'
    })
  })
  // Routers can be nested
  .get('/section', Router()
    .get('/page', async ({ path, resolve, exiting }) => {
      path // '/page'
      setupListeners()

      // call resolve when ready to prevent further middleware from running
      // optionally pass a value to resolve
      // suggestion: resolve to the view representation
      resolve(<Page />)

      // exiting is a promise that resolves when the url changes
      await exiting // only await after resolve, or it won't resolve until next url change!!
      cleanupListeners()
    })
  )

// trigger a route with optional state (used mostly server side)
let routing = router.route(url, { foo: 'bar' })
let view = await routing
ReactDOMServer.renderToString(view)

// client code
router
  // render the view each time the url changes
  .on('route', async (args, routing) => {
    let view = await routing
    ReactDOM.render(view, document.getElementById('view'))
  })
  // listen for url changes and link clicks (client only)
  .start({ routeLinks: true })
```


API
---

### Router(options)

```js
import Router from 'middle-router'
// or var Router = require('middle-router')

router = Router({ hash: '#!' })
router = new Router()
```

`Router` Constructs a new router object. Using the `new` keyword is optional. The `options` argument is an optional object with options for how the router will function.

#### options.hash

Defaults to `false`, meaning routing will be based on `location.pathname`.
If `true`, enables routing based on `location.hash`.
If a string value beginning with `'#'`, the string prefix will be ignored when routing.

### Router#routing: ?Promise

```js
await router.routing
```

The same promise returned by `route()`, representing the current routing flow. This is `null` when there is no currently running flow.

### Router#start(options: ?Object): Router

```js
router.start({ routeLinks: true })
```

Start listening for hashchange/popstate events, and optionally link click events. Immediately routes the current url.

#### options.routeLinks

Defaults to `false`, meaning link clicks are not handled. If `true`, link clicks will trigger a call to `navigate` with the link's `href`.

#### options.confirm

Defaults to `window.confirm`. A function that takes a confirm message string returns a boolean. The function is called to confirm if a `beforeExit` handler prevents default, or returns a confirmation message. A `true` returned from this function means that navigation will continue. A `false` means the user stays.

It is recommended that you use a custom function that calls `window.confirm` with a static localized message, and your `beforeExit` handlers just call `event.preventDefault()`.

### Router#stop(): Router

```js
router.stop()
```

Stop listening for hashchange/popstate and link click events.

### Router#navigate(url: string, state: ?Object): Router

```js
router.navigate('/new/path/to/glory')
```

Update the current location and run the new route.
This is similar to `window.location.assign()` in terms of history.

#### url

The new url to navigate to.

#### state

Optional state object to add to the middleware argument object.

### Router#replace(url: string, state: ?Object): Router

```js
router.replace('/where/you/belong')
```

Replace the current location and run the new route.
This is similar to `window.location.replace()` in terms of history.

#### url

The new url to replace the current with.

#### state

Optional state object to add to the middleware argument object.

### Router#use(path: ?string, ...middleware: Function[]): Router

```js
router.use(async ({ path, next }) => {
  let start = Date.now()
  await next()
  let ms = Date.now() - start
  console.log(`${path} took ${ms}ms`)
}, async ({ next, resolve }) => {
  try {
    await next()
  } catch (e) {
    console.error(e)
    resolve(<Error error={ e } />)
  }
})
```

Add the middleware functions to the list.
If path is specified, only execute the middleware when the url matches.

#### path

The url path to match.

#### ...middleware

The middleware functions to execute when routing. More on the signature of these function is documented below.
Router objects can also be passed as middleware.

### Router#get(path: ?string, ...middleware: Function[]): Router

Alias for use.

### Router#route(url: string, state: ?Object): Promise

```js
let routing = router.route('/route/66')
routing.then(value => { /* route resolved with value */ })
```

Run through the middleware for the url.
This is typically used on the server, and client uses start instead.

The returned promise is resolved with whatever is passed to `resolve()` in the middleware functions when the whole series is finished running.

#### url

The new url to go to.

#### state

Optional state object to add to the middleware argument object.

### Router#expressHandler()

```js
express()
  .use('/api', apiRouter)
  .get('/*', clientRouter.expressHandler())
```

Get a function to pass to express that mounts the Router.

### middleware functions

```js
router.use(async ({ context, next, resolve }) => {
  let v1 = await next()
  let v2 = await resolve(v1 + 'foo')
})
```

Each middleware function recieves a single object argument containing: `context`, `next`, `resolve`, `location`, `path`, `params`, `state`, and `exiting`. Any properties you might add to this object will *not* be passed on to subsequent middleware.

#### context

By default, the context is an object that is part of the middleware argument. The same object will be passed to each and every middleware that runs.

You can replace the default object with whatever you like by passing a `context` property to the top-level middleware returned by `run`.

Any properties added to the root argument object will not be carried to next middleware, so if you need something shared, `context` is the place to put it.

#### next

Calling `next()` will immediately start the next middleware, and return a promise that will resolve to the value passed to `resolve` in a downstream middleware. When the promise resolves, all downstream middleware have completely finished running.

Control will continue upstream when this middleware returns (or resolves if it is an async function or returns a promise), or as soon as `resolve` is called.

`next` should only be called once, but if you do call `next` again in the same middleware function, it will simply return the same promise it did initially.

#### resolve

Calling `resolve()` will allow control to flow back to the previous middleware, even if this middleware function hasn't completed. A value can be passed as the first argument, and will set the value to resolve the whole series with. If no value is passed in, the current resolved value remains unchanged.

`resolve` returns a promise that will resolve to the final value, which may have been changed by upstream middleware.

Calling `resolve` will prevent any downstream middleware from running if called before this middleware has completed or `next` is called. If `next` is called after resolve, it will not trigger the next middleware, but will return a promise that resolves to the current value (last passed to `resolve`).

#### location

The `location` object has most of the same properties as `window.location`, describing the full url currently being routed. Additionally it has a `query` property that is an object with the parsed `search` property.

#### path

The current path. As routes are nested, `path` will not have the prefix matched from the parent router removed.

#### params

Path parameters specified with a `:` in the `use(path)` are added to the `params` object.

#### state

`state` is an object intended to mirror the state object given to `history.pushState` and recieved from `history.onpopstate`.

#### beforeExit

Call `beforeExit` with a callback function. The function will handle `beforeunload` events on the window, and `beforeexit` events on the router. To prompt users to confirm before leaving, either call `event.preventDefault()`, set `event.returnValue` to a string, or return a string. See [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload) on cross-browser handling of `beforeunload`.

Note that handlers registered with `beforeExit` are automatically removed when the user completes navigation. This can be either because no handler prevented the navigation, or the user confirmed the navigation.

#### exiting

This is a promise that resolves as soon as the next routing begins. This can be very helpful to perform cleanup when the url is no longer matching. If the router is not listening to url changes, such as when running on the server, `exiting` is `undefined`. In an async function, you may want to `await exiting`, but make sure to only do so after calling `resolve()`, or the middleware won't pass control back upstream until the url is next changed!

To perform cleanup immediately on server, and when the route exits on client, you can wrap it with `Promise.resolve(exiting)` to consistently have a promise to work with.


Async Middleware
----------------

middle-router can work with any promised-based async middleware, but it was designed specifically for ES7 async functions. Inspired by [koa][koa]'s `yield next`, middle-router allows you to `await next()` so you can `next()` "downstream" and the `await` for control to flow back "upstream".


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
[middle-run]: https://github.com/thetalecrafter/middle-run
[koa]: http://koajs.com
[LICENSE]: https://github.com/thetalecrafter/middle-router/blob/master/LICENSE-MIT
