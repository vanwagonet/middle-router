/* eslint-env mocha */
const assert = require('assert')
const Router = require('../router')

// run args tests
require('./arguments.test')

function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

describe('Router', () => {
  describe('#constructor', () => {
    it('can be called as a function', async () => {
      let router = Router()
      assert(router instanceof Router, 'Router() should return an instanceof Router')
      assert.strictEqual(router.hash, false, 'hash should be false by default')
      assert.strictEqual(router.routing, null, 'routing should be null by default')
    })

    it('can be called as a constructor', async () => {
      let router = new Router()
      assert(router instanceof Router, 'new Router() should return an instanceof Router')
      assert.strictEqual(router.hash, false, 'hash should be false by default')
      assert.strictEqual(router.routing, null, 'routing should be null by default')
    })
  })

  describe('#use', () => {
    it('returns the router', async () => {
      let router = new Router()
      assert.strictEqual(router.use(), router, 'use should return the router')
    })

    it('adds each callback to the middleware', async () => {
      let router = new Router()
        .use(() => {}, () => {})
      assert.strictEqual(router.middleware.length, 2, 'should have a middleware per callback')
    })

    it('accepts a path as the first arg', async () => {
      let router = new Router()
        .use('/form', () => {}, () => {})
      assert.strictEqual(router.middleware.length, 2, 'should have a middleware per callback')
    })
  })

  describe('#lazy', () => {
    it('returns the router', async () => {
      let router = new Router()
      assert.strictEqual(router.lazy(), router, 'use should return the router')
    })

    it('adds the callback to the middleware', async () => {
      let router = new Router()
        .lazy(() => {})
      assert.strictEqual(router.middleware.length, 1, 'should have a middleware for the callback')
    })

    it('accepts a path as the first arg', async () => {
      let router = new Router()
        .lazy('/form', () => {})
      assert.strictEqual(router.middleware.length, 1, 'should have a middleware for the callback')
    })
  })

  describe('#route', () => {
    it('returns a promise', async () => {
      let router = new Router().use('/', ({ resolve }) => { resolve() })
      let value = router.route('/')
      assert(value.then && value.catch, 'route should return a promise')
      assert.strictEqual(router.routing, value, 'routing should be the same promise returned by route()')
      await value
      assert.strictEqual(router.routing, null, 'routing should be null after finished')
    })

    it('routes through the matching middleware', async () => {
      let called = 0
      let router = new Router()
        .use('/foo/:bar', () => {
          ++called
        })
        .use('/somewhere/else', ({ resolve }) => {
          assert.fail('should not run non-matching middleware')
          resolve()
        })
        .use(({ resolve }) => {
          ++called
          resolve()
        })
        .use(() => ++called)
      await router.route('/foo/bar')
      assert.strictEqual(called, 2, 'should only be called for matching routes up until resolve() is called')
    })

    it('has an object containing all the parameters', async () => {
      let called = 0
      let router = new Router()
        .use('/foo/:bar', ({ params, resolve }) => {
          ++called
          assert.strictEqual(params.bar, 'bar', 'params should contain the path parameter')
          resolve()
        })
      await router.route('/foo/bar')
      assert.strictEqual(called, 1, 'matching route should be called')
    })

    it('passes the state in the arguments', async () => {
      let called = 0
      let ostate = { foo: 'bar' }
      let router = new Router()
        .use('/foo/:bar', ({ state, resolve }) => {
          ++called
          assert.strictEqual(state, ostate, 'state should be unaltered in the arguments')
          resolve()
        })
      await router.route('/foo/bar', ostate)
      assert.strictEqual(called, 1, 'matching route should be called')
    })

    it('passes parameters to nested routers', async () => {
      let called = 0
      let router = new Router()
        .use('/:foo', new Router()
          .use('/', ({ params, resolve }) => {
            ++called
            assert.strictEqual(params.foo, 'foo', 'parameters should propagate through nested routes')
            resolve()
          })
        )
      await router.route('/foo/')
      assert.strictEqual(called, 1, 'matching route should be called')
    })

    it('routes through arbitrarily deep nested routers', async () => {
      let called = 0
      let router = Router()
        .use('/:foo', Router().use(Router().use(Router()
          .use('/bar', Router().use(Router()
            .use('/:baz', ({ params, resolve }) => {
              ++called
              assert.strictEqual(params.foo, 'foo', 'param foo should be propagated')
              assert.strictEqual(params.baz, 'bar', 'param baz should be propagated')
              resolve()
            })
          ))
        )))
      await router.route('/foo/bar/bar')
      assert.strictEqual(called, 1, 'matching route should be called')
    })

    it('nested router can match parent path even when no trailing slash', async () => {
      let called = 0
      let router = Router()
        .use('/:foo', Router()
          .use('/bar', Router()
            .use('/', ({ params, resolve }) => {
              ++called
              assert.strictEqual(params.foo, 'foo', 'param foo should be propagated')
              resolve()
            })
          )
        )
      await router.route('/foo/bar')
      assert.strictEqual(called, 1, 'matching route should be called')
    })

    it('routes can be asynchronous', async () => {
      let called = 0
      let router = Router()
        .use('/', async ({ next }) => {
          await sleep(10)
          assert.strictEqual(++called, 1, 'first matching route should happen first')
          await next()
          assert.strictEqual(++called, 3, 'after next should happen last')
        })
        .use('/bogus', () => {
          assert.fail('should not call a non-matching route')
        })
        .use('/', Router().use(({ resolve }) => {
          assert.strictEqual(++called, 2, 'last matching route should happen second')
          resolve()
        }))
      await router.route('/')
      assert.strictEqual(called, 3, 'matching routes should be called')
    })

    it('routes can be lazy', async () => {
      let called = 0
      let router = Router()
        .lazy('/lazy', () => {
          assert.strictEqual(++called, 1, 'lazy matching route should happen first')
          return Promise.resolve(({ resolve }) => {
            ++called
            resolve('jit ftw')
          })
        })
        .use('/lazy', () => {
          assert.fail('should never get here')
        })
      assert.strictEqual(await router.route('/lazy'), 'jit ftw')
      assert.strictEqual(called, 2, 'matching routes should be called')

      assert.strictEqual(await router.route('/lazy'), 'jit ftw')
      assert.strictEqual(called, 3, 'wrapper should not be called after loaded')
    })

    it('lazy routes can resolve to routers', async () => {
      let called = 0
      let router = Router()
        .lazy('/lazy', () => {
          assert.strictEqual(++called, 1, 'lazy matching route should happen first')
          return Promise.resolve(Router().use(({ resolve }) => {
            ++called
            resolve('jit ftw')
          }))
        })
        .use('/lazy', () => {
          assert.fail('should never get here')
        })
      assert.strictEqual(await router.route('/lazy/123'), 'jit ftw')
      assert.strictEqual(called, 2, 'matching routes should be called')

      assert.strictEqual(await router.route('/lazy/123'), 'jit ftw')
      assert.strictEqual(called, 3, 'wrapper should not be called after loaded')
    })
  })

  if (typeof window === 'undefined') {
    describe('#start', () => {
      it('cannot listen without a window object', () => {
        let router = Router()
        assert.throws(() => router.start(), 'start should throw without a window')
        assert.strictEqual(router.isListening, false, 'isListening should still be false')
      })
    })

    describe('#stop', () => {
      it('is a no op since you cannot start', () => {
        let router = Router()
        router.stop()
        assert.strictEqual(router.isListening, false, 'isListening should still be false')
      })
    })
  }
})
