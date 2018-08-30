/* eslint-env mocha */
const assert = require('assert')
const Router = require('../router')

describe('Route middleware arguments', () => {
  it('has location with a parsed url', async () => {
    let router = Router()
      .use(({ location, resolve }) => {
        assert.strictEqual(location.href, 'https://test.example:886/path?search=query&a=0&a=1&a=2#hash', 'href must contain the whole url')
        assert.strictEqual(location.protocol, 'https:', 'location must have correct protocol')
        assert.strictEqual(location.host, 'test.example:886', 'location must have correct host')
        assert.strictEqual(location.hostname, 'test.example', 'location must have correct hostname')
        assert.strictEqual(location.port, '886', 'location must have correct port')
        assert.strictEqual(location.pathname, '/path', 'location must have correct pathname')
        assert.strictEqual(location.search, '?search=query&a=0&a=1&a=2', 'location must have correct search')
        assert.strictEqual(location.query.search, 'query', 'location must have correct query parsed from search')
        assert.deepStrictEqual(location.query.a, [ '0', '1', '2' ], 'multiple values with the same name make an array')
        assert.strictEqual(location.hash, '#hash', 'location must have correct hash')
        resolve()
      })
    await router.route('https://test.example:886/path?search=query&a=0&a=1&a=2#hash')
  })

  it('has path with the pathname', async () => {
    let router = Router()
      .use('/hash', () => {
        assert.fail('must not match from hash when pathname routing')
      })
      .use(({ path }) => {
        assert.strictEqual(path, '/path/route', 'path must be from pathname')
      })
      .use('/path', Router().use(({ path, location, resolve }) => {
        assert.strictEqual(path, '/route', 'path is relative to mount point')
        assert.strictEqual(location.pathname, '/path/route', 'pathname is unchanged by mounting')
        resolve()
      }))
    await router.route('/path/route#/hash')
  })

  it('has no exiting promise when not listening', async () => {
    let router = Router()
      .use(({ exiting, resolve }) => {
        assert.strictEqual(exiting, undefined, 'exiting must not be defined when not listening')
        resolve()
      })
    await router.route('/')
  })

  it('has router pointing to the top-level router', async () => {
    let topRouter = Router()
      .use(Router().use(({ router, resolve }) => {
        assert.strictEqual(router, topRouter, 'router must be the top-level router')
        resolve()
      }))
    await topRouter.route('/')
  })

  it('has a beforeExit function', async () => {
    let router = Router()
      .use(({ beforeExit, resolve }) => {
        assert.strictEqual(typeof beforeExit, 'function', 'beforeExit must be a function')
        resolve()
      })
    await router.route('/')
  })

  it('has a context object', async () => {
    let router = Router()
      .use(({ context, resolve }) => {
        assert.strictEqual(typeof context, 'object', 'context must be an object by default')
        resolve()
      })
    await router.route('/')
  })

  it('uses context passed to Router', async () => {
    let example = { a: 'b' }
    let router = Router({ context: example })
      .use(({ context, resolve }) => {
        assert.strictEqual(context, example, 'context must be the object passed into Router')
        resolve()
      })
    await router.route('/')
  })
})
