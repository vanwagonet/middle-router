import test from 'blue-tape'
import Router from '../lib/router'

test('middleware location is a parsed url', async t => {
  let router = Router()
    .use(({ location, resolve }) => {
      t.equal(location.href, 'https://test.example:886/path?search=query&a=0&a=1&a=2#hash', 'href must contain the whole url')
      t.equal(location.protocol, 'https:', 'location must have correct protocol')
      t.equal(location.host, 'test.example:886', 'location must have correct host')
      t.equal(location.hostname, 'test.example', 'location must have correct hostname')
      t.equal(location.port, '886', 'location must have correct port')
      t.equal(location.pathname, '/path', 'location must have correct pathname')
      t.equal(location.search, '?search=query&a=0&a=1&a=2', 'location must have correct search')
      t.equal(location.query.search, 'query', 'location must have correct query parsed from search')
      t.deepEqual(location.query.a, [ '0', '1', '2' ], 'multiple values with the same name make an array')
      t.equal(location.hash, '#hash', 'location must have correct hash')
      resolve()
    })
  await router.route('https://test.example:886/path?search=query&a=0&a=1&a=2#hash')
})

test('middleware path is the pathname', async t => {
  let router = Router()
    .use('/hash', () => {
      t.fail('must not match from hash when pathname routing')
    })
    .use(({ path }) => {
      t.equal(path, '/path/route', 'path must be from pathname')
    })
    .use('/path', Router().use(({ path, location, resolve }) => {
      t.equal(path, '/route', 'path is relative to mount point')
      t.equal(location.pathname, '/path/route', 'pathname is unchanged by mounting')
      resolve()
    }))
  await router.route('/path/route#/hash')
})

test('middleware path is the hash if hash routing enabled', async t => {
  let router = Router({ hash: '#$!' })
    .use('/path', () => {
      t.fail('must not match from pathname when hash routing')
    })
    .use(({ path }) => {
      t.equal(path, '/hash/route', 'path must be from hash')
    })
    .use('/hash', Router().use(({ path, location, resolve }) => {
      t.equal(path, '/route', 'path is relative to mount point')
      t.equal(location.hash, '#$!/hash/route', 'hash is unchanged by mounting')
      resolve()
    }))
  await router.route('/path#$!/hash/route')
})

test('middleware has no exiting promise when not listening', async t => {
  let router = Router()
    .use(({ exiting, resolve }) => {
      t.equal(exiting, undefined, 'exiting must not be defined when not listening')
      resolve()
    })
  await router.route('/')
})
