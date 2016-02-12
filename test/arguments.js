/* eslint-env mocha */
import assert from 'power-assert'
import Router from '../lib/router'

describe('Route middleware arguments', () => {
  it('has location with a parsed url', async () => {
    let router = Router()
      .use(({ location, resolve }) => {
        assert.equal(location.href, 'https://test.example:886/path?search=query&a=0&a=1&a=2#hash', 'href must contain the whole url')
        assert.equal(location.protocol, 'https:', 'location must have correct protocol')
        assert.equal(location.host, 'test.example:886', 'location must have correct host')
        assert.equal(location.hostname, 'test.example', 'location must have correct hostname')
        assert.equal(location.port, '886', 'location must have correct port')
        assert.equal(location.pathname, '/path', 'location must have correct pathname')
        assert.equal(location.search, '?search=query&a=0&a=1&a=2', 'location must have correct search')
        assert.equal(location.query.search, 'query', 'location must have correct query parsed from search')
        assert.deepEqual(location.query.a, [ '0', '1', '2' ], 'multiple values with the same name make an array')
        assert.equal(location.hash, '#hash', 'location must have correct hash')
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
        assert.equal(path, '/path/route', 'path must be from pathname')
      })
      .use('/path', Router().use(({ path, location, resolve }) => {
        assert.equal(path, '/route', 'path is relative to mount point')
        assert.equal(location.pathname, '/path/route', 'pathname is unchanged by mounting')
        resolve()
      }))
    await router.route('/path/route#/hash')
  })

  it('has no exiting promise when not listening', async () => {
    let router = Router()
      .use(({ exiting, resolve }) => {
        assert.equal(exiting, undefined, 'exiting must not be defined when not listening')
        resolve()
      })
    await router.route('/')
  })

  it('has router pointing to the top-level router', async () => {
    let topRouter = Router()
      .use(Router().use(({ router, resolve }) => {
        assert.equal(router, topRouter, 'router must be the top-level router')
        resolve()
      }))
    await topRouter.route('/')
  })
})
