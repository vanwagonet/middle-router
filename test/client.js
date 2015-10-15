import test from 'blue-tape'
import Router from '../lib/router'

function sleep (time) {
  return new Promise(r => setTimeout(r, time))
}

test('Router#constructor can be called as a function', async t => {
  let router = Router()
  t.ok(router instanceof Router, 'Router() should return an instanceof Router')
  t.equal(router.hash, false, 'hash should be false by default')
})

test('Router#constructor can be called as a constructor', async t => {
  let router = new Router()
  t.ok(router instanceof Router, 'new Router() should return an instanceof Router')
  t.equal(router.hash, false, 'hash should be false by default')
})

test('Router#use returns the router', async t => {
  let router = new Router()
  t.equal(router.use(), router, 'use should return the router')
})

test('Router#use adds each callback to the middleware', async t => {
  let router = new Router()
    .use(() => {}, () => {})
  t.equal(router.middleware.length, 2, 'should have a middleware per callback')
})

test('Router#use accepts a path as the first arg', async t => {
  let router = new Router()
    .use('/form', () => {}, () => {})
  t.equal(router.middleware.length, 2, 'should have a middleware per callback')
})

test('Router#route returns a promise', async t => {
  let router = new Router().use('/', (c, n, stop) => stop())
  let value = router.route('/')
  t.ok(value.then && value.catch, 'route should return a promise')
})

test('Router#route logs an error if no route matches', async t => {
  let router = new Router()
  let error = console.error
  let called
  console.error = function (err) {
    t.equal(err, 'no route matches /', 'should match the no route found error')
    called = true
  }
  await router.route('/')
  t.equal(called, true, 'console.error should be called on unhandled route')
  console.error = error
})

test('Router#route routes through the matching middleware', async t => {
  let called = 0
  let router = new Router()
    .use('/foo/:bar', (ctx, next) => {
      ++called
    })
    .use('/somewhere/else', (ctx, next, stop) => {
      t.fail('should not run non-matching middleware')
      stop()
    })
    .use((ctx, next, stop) => {
      ++called
      stop()
    })
    .use(() => ++called)
  await router.route('/foo/bar')
  t.equal(called, 2, 'should only be called for matching routes up until stop() is called')
})

test('Router#route has an object containing all the parameters', async t => {
  let called = 0
  let router = new Router()
    .use('/foo/:bar', (ctx, next, stop) => {
      ++called
      t.equal(ctx.params.bar, 'bar', 'params should contain the path parameter')
      stop()
    })
  await router.route('/foo/bar')
  t.equal(called, 1, 'matching route should be called')
})

test('Router#route passes the state in the context', async t => {
  let called = 0
  let state = { foo: 'bar' }
  let router = new Router()
    .use('/foo/:bar', (ctx, next, stop) => {
      ++called
      t.equal(ctx.state, state, 'state should be unaltered in the context')
      stop()
    })
  await router.route('/foo/bar', state)
  t.equal(called, 1, 'matching route should be called')
})

test('Router#route passes parameters to nested routers', async t => {
  let called = 0
  let router = new Router()
    .use('/:foo', new Router()
      .use('/', (ctx, next, stop) => {
        ++called
        t.equal(ctx.params.foo, 'foo', 'parameters should propagate through nested routes')
        stop()
      })
    )
  await router.route('/foo/')
  t.equal(called, 1, 'matching route should be called')
})

test('Router#route routes through arbitrarily deep nested routers', async t => {
  let called = 0
  let router = Router()
    .use('/:foo', Router().use(Router().use(Router()
      .use('/bar', Router().use(Router()
        .use('/:baz', (ctx, next, stop) => {
          ++called
          t.equal(ctx.params.foo, 'foo', 'param foo should be propagated')
          t.equal(ctx.params.baz, 'bar', 'param baz should be propagated')
          stop()
        })
      ))
    )))
  await router.route('/foo/bar/bar')
  t.equal(called, 1, 'matching route should be called')
})

test('Router#route nested router can match parent path even when no trailing slash', async t => {
  let called = 0
  let router = Router()
    .use('/:foo', Router()
      .use('/bar', Router()
        .use('/', (ctx, next, stop) => {
          ++called
          t.equal(ctx.params.foo, 'foo', 'param foo should be propagated')
          stop()
        })
      )
    )
  await router.route('/foo/bar')
  t.equal(called, 1, 'matching route should be called')
})

test('Router#route routes can be asynchronous', async t => {
  let called = 0
  let router = Router()
    .use('/', async (ctx, next) => {
      await sleep(10)
      t.equal(++called, 1, 'first matching route should happen first')
      await next()
      t.equal(++called, 3, 'after next should happen last')
    })
    .use('/bogus', () => {
      t.fail('should not call a non-matching route')
    })
    .use('/', Router().use((ctx, next, stop) => {
      t.equal(++called, 2, 'last matching route should happen second')
      stop()
    }))
  await router.route('/')
  t.equal(called, 3, 'matching routes should be called')
})

test('Router#start using push/pop stateroutes from the current location.pathname', async t => {
  let routing
  let called = 0
  let router = new Router({ onRoute(p) { routing = p } })
    .use('/foo/:bar', (ctx, next, stop) => {
      ++called
      t.equal(ctx.params.bar, 'bar', 'param bar should be set')
      stop()
    })

  history.replaceState(null, document.title, '/foo/bar')
  router.start().stop()
  await routing
  t.equal(called, 1, 'matching route should be called')
})

test('Router#start listens to popstate events', async t => {
  let routing
  let called = 0
  let router = new Router({ onRoute(p) { routing = p } })
    .use('/foo/:bar', ctx => {
      ++called
      t.equal(ctx.params.bar, 'bas', 'param bar should be set')
    })
    .use((ctx, next, stop) => stop())

  history.replaceState(null, document.title, '/foo/bas')
  router.start() // called 1
  await routing

  history.pushState(null, document.title, '/') // not called
  await sleep(10) // give time for popstate event to fire
  await routing

  history.back() // called 2
  await sleep(10)
  await routing

  history.forward() // not called
  await sleep(10)
  await routing

  history.back() // called 3
  await sleep(10)
  await routing

  router.stop()
  t.equal(called, 3, 'matching route should be called for each matching location')
})

test('Router#start routes from the current location.hash', async t => {
  let routing
  let called = 0
  let router = new Router({ hash: true, onRoute(p) { routing = p } })
    .use('/foo/:bar', (ctx, next, stop) => {
      ++called
      t.equal(ctx.params.bar, 'bat', 'param bar should be set')
      stop()
    })

  location.hash = '#/foo/bat'
  router.start().stop()
  await routing
  t.equal(called, 1, 'matching route should be called')
})

test('Router#start listens to hashchange events', async t => {
  let routing
  let called = 0
  let router = new Router({ hash: true, onRoute(p) { routing = p } })
    .use('/foo/:bar', ctx => {
      ++called
      t.equal(ctx.params.bar, 'bax', 'param bar should be set')
    })
    .use((ctx, next, stop) => stop())

  location.hash = '#/foo/bax'
  router.start() // called 1
  await routing

  location.hash = '#/' // not called
  await sleep(10) // give time for hashchange event to fire
  await routing

  history.back() // called 2
  await sleep(10)
  await routing

  history.forward() // not called
  await sleep(10)
  await routing

  history.back() // called 3
  await sleep(10)
  await routing

  router.stop()
  t.equal(called, 3, 'matching route should be called for each matching location')
})

test('Router#routeFromLocation routes from the current location.pathname', async t => {
  let routing
  let called = 0
  let router = new Router({ onRoute(p) { routing = p } })
    .use('/foo/:bar', (ctx, next, stop) => {
      ++called
      t.equal(ctx.params.bar, 'baz', 'param bar should be set')
      stop()
    })

  history.replaceState(null, document.title, '/foo/baz')
  router.routeFromLocation()
  await routing
  t.equal(called, 1, 'matching route should be called')
})

test('Router#routeFromLocation routes from the current location.hash', async t => {
  let routing
  let called = 0
  let router = new Router({ hash: true, onRoute(p) { routing = p } })
    .use('/foo/:bar', (ctx, next, stop) => {
      ++called
      t.equal(ctx.params.bar, 'bay', 'param bar should be set')
      stop()
    })

  location.hash = '#/foo/bay'
  router.routeFromLocation()
  await routing
  t.equal(called, 1, 'matching route should be called')
})
