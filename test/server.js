/* eslint-env mocha */
import assert from 'power-assert'
import Router from '../lib/router'

// run args tests
import './arguments'

function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

describe('Router', () => {
  describe('#constructor', () => {
    it('can be called as a function', async () => {
      let router = Router()
      assert(router instanceof Router, 'Router() should return an instanceof Router')
      assert.equal(router.hash, false, 'hash should be false by default')
      assert.equal(router.routing, null, 'routing should be null by default')
    })

    it('can be called as a constructor', async () => {
      let router = new Router()
      assert(router instanceof Router, 'new Router() should return an instanceof Router')
      assert.equal(router.hash, false, 'hash should be false by default')
      assert.equal(router.routing, null, 'routing should be null by default')
    })
  })

  describe('#use', () => {
    it('returns the router', async () => {
      let router = new Router()
      assert.equal(router.use(), router, 'use should return the router')
    })

    it('adds each callback to the middleware', async () => {
      let router = new Router()
        .use(() => {}, () => {})
      assert.equal(router.middleware.length, 2, 'should have a middleware per callback')
    })

    it('accepts a path as the first arg', async () => {
      let router = new Router()
        .use('/form', () => {}, () => {})
      assert.equal(router.middleware.length, 2, 'should have a middleware per callback')
    })
  })

  describe('#lazy', () => {
    it('returns the router', async () => {
      let router = new Router()
      assert.equal(router.lazy(), router, 'use should return the router')
    })

    it('adds the callback to the middleware', async () => {
      let router = new Router()
        .lazy(() => {})
      assert.equal(router.middleware.length, 1, 'should have a middleware for the callback')
    })

    it('accepts a path as the first arg', async () => {
      let router = new Router()
        .lazy('/form', () => {})
      assert.equal(router.middleware.length, 1, 'should have a middleware for the callback')
    })
  })

  describe('#route', () => {
    it('returns a promise', async () => {
      let router = new Router().use('/', ({ resolve }) => { resolve() })
      let value = router.route('/')
      assert(value.then && value.catch, 'route should return a promise')
      assert.equal(router.routing, value, 'routing should be the same promise returned by route()')
      await value
      assert.equal(router.routing, null, 'routing should be null after finished')
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
      assert.equal(called, 2, 'should only be called for matching routes up until resolve() is called')
    })

    it('has an object containing all the parameters', async () => {
      let called = 0
      let router = new Router()
        .use('/foo/:bar', ({ params, resolve }) => {
          ++called
          assert.equal(params.bar, 'bar', 'params should contain the path parameter')
          resolve()
        })
      await router.route('/foo/bar')
      assert.equal(called, 1, 'matching route should be called')
    })

    it('passes the state in the arguments', async () => {
      let called = 0
      let ostate = { foo: 'bar' }
      let router = new Router()
        .use('/foo/:bar', ({ state, resolve }) => {
          ++called
          assert.equal(state, ostate, 'state should be unaltered in the arguments')
          resolve()
        })
      await router.route('/foo/bar', ostate)
      assert.equal(called, 1, 'matching route should be called')
    })

    it('passes parameters to nested routers', async () => {
      let called = 0
      let router = new Router()
        .use('/:foo', new Router()
          .use('/', ({ params, resolve }) => {
            ++called
            assert.equal(params.foo, 'foo', 'parameters should propagate through nested routes')
            resolve()
          })
        )
      await router.route('/foo/')
      assert.equal(called, 1, 'matching route should be called')
    })

    it('routes through arbitrarily deep nested routers', async () => {
      let called = 0
      let router = Router()
        .use('/:foo', Router().use(Router().use(Router()
          .use('/bar', Router().use(Router()
            .use('/:baz', ({ params, resolve }) => {
              ++called
              assert.equal(params.foo, 'foo', 'param foo should be propagated')
              assert.equal(params.baz, 'bar', 'param baz should be propagated')
              resolve()
            })
          ))
        )))
      await router.route('/foo/bar/bar')
      assert.equal(called, 1, 'matching route should be called')
    })

    it('nested router can match parent path even when no trailing slash', async () => {
      let called = 0
      let router = Router()
        .use('/:foo', Router()
          .use('/bar', Router()
            .use('/', ({ params, resolve }) => {
              ++called
              assert.equal(params.foo, 'foo', 'param foo should be propagated')
              resolve()
            })
          )
        )
      await router.route('/foo/bar')
      assert.equal(called, 1, 'matching route should be called')
    })

    it('routes can be asynchronous', async () => {
      let called = 0
      let router = Router()
        .use('/', async ({ next }) => {
          await sleep(10)
          assert.equal(++called, 1, 'first matching route should happen first')
          await next()
          assert.equal(++called, 3, 'after next should happen last')
        })
        .use('/bogus', () => {
          assert.fail('should not call a non-matching route')
        })
        .use('/', Router().use(({ resolve }) => {
          assert.equal(++called, 2, 'last matching route should happen second')
          resolve()
        }))
      await router.route('/')
      assert.equal(called, 3, 'matching routes should be called')
    })

    it('routes can be lazy', async () => {
      let called = 0
      let router = Router()
        .lazy('/lazy', () => {
          assert.equal(++called, 1, 'lazy matching route should happen first')
          return Promise.resolve(({ resolve }) => {
            ++called
            resolve('jit ftw')
          })
        })
        .use('/lazy', () => {
          assert.fail('should never get here')
        })
      assert.equal(await router.route('/lazy'), 'jit ftw')
      assert.equal(called, 2, 'matching routes should be called')

      assert.equal(await router.route('/lazy'), 'jit ftw')
      assert.equal(called, 3, 'wrapper should not be called after loaded')
    })

    it('lazy routes can resolve to routers', async () => {
      let called = 0
      let router = Router()
        .lazy('/lazy', () => {
          assert.equal(++called, 1, 'lazy matching route should happen first')
          return Promise.resolve(Router().use(({ resolve }) => {
            ++called
            resolve('jit ftw')
          }))
        })
        .use('/lazy', () => {
          assert.fail('should never get here')
        })
      assert.equal(await router.route('/lazy/123'), 'jit ftw')
      assert.equal(called, 2, 'matching routes should be called')

      assert.equal(await router.route('/lazy/123'), 'jit ftw')
      assert.equal(called, 3, 'wrapper should not be called after loaded')
    })
  })
})
