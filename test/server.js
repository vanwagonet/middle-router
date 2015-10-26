import test from 'blue-tape'
import Router from '../lib/router'

// run args tests
import './arguments'

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
  let router = new Router().use('/', ({ resolve }) => { resolve() })
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
    .use('/foo/:bar', () => {
      ++called
    })
    .use('/somewhere/else', ({ resolve }) => {
      t.fail('should not run non-matching middleware')
      resolve()
    })
    .use(({ resolve }) => {
      ++called
      resolve()
    })
    .use(() => ++called)
  await router.route('/foo/bar')
  t.equal(called, 2, 'should only be called for matching routes up until resolve() is called')
})

test('Router#route has an object containing all the parameters', async t => {
  let called = 0
  let router = new Router()
    .use('/foo/:bar', ({ params, resolve }) => {
      ++called
      t.equal(params.bar, 'bar', 'params should contain the path parameter')
      resolve()
    })
  await router.route('/foo/bar')
  t.equal(called, 1, 'matching route should be called')
})

test('Router#route passes the state in the context', async t => {
  let called = 0
  let ostate = { foo: 'bar' }
  let router = new Router()
    .use('/foo/:bar', ({ state, resolve }) => {
      ++called
      t.equal(state, ostate, 'state should be unaltered in the context')
      resolve()
    })
  await router.route('/foo/bar', ostate)
  t.equal(called, 1, 'matching route should be called')
})

test('Router#route passes parameters to nested routers', async t => {
  let called = 0
  let router = new Router()
    .use('/:foo', new Router()
      .use('/', ({ params, resolve }) => {
        ++called
        t.equal(params.foo, 'foo', 'parameters should propagate through nested routes')
        resolve()
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
        .use('/:baz', ({ params, resolve }) => {
          ++called
          t.equal(params.foo, 'foo', 'param foo should be propagated')
          t.equal(params.baz, 'bar', 'param baz should be propagated')
          resolve()
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
        .use('/', ({ params, resolve }) => {
          ++called
          t.equal(params.foo, 'foo', 'param foo should be propagated')
          resolve()
        })
      )
    )
  await router.route('/foo/bar')
  t.equal(called, 1, 'matching route should be called')
})

test('Router#route routes can be asynchronous', async t => {
  let called = 0
  let router = Router()
    .use('/', async ({ next }) => {
      await sleep(10)
      t.equal(++called, 1, 'first matching route should happen first')
      await next()
      t.equal(++called, 3, 'after next should happen last')
    })
    .use('/bogus', () => {
      t.fail('should not call a non-matching route')
    })
    .use('/', Router().use(({ resolve }) => {
      t.equal(++called, 2, 'last matching route should happen second')
      resolve()
    }))
  await router.route('/')
  t.equal(called, 3, 'matching routes should be called')
})
