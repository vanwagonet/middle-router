/* eslint-env mocha */
import assert from 'power-assert'
import Router from '../lib/router'

// run same tests as on server
import './server'
import './links'

describe('Router#start using push/pop state', () => {
  it('routes from the current location.pathname', async () => {
    let called = 0
    let router = new Router()
      .use('/foo/:bar', ({ params, resolve }) => {
        ++called
        assert.equal(params.bar, 'bar', 'param bar should be set')
        resolve()
      })

    history.replaceState(null, document.title, '/foo/bar')
    await router.start()
    router.stop()
    assert.equal(called, 1, 'matching route should be called')
  })

  it('listens to popstate events', async () => {
    let called = 0
    let router = new Router()
      .use('/foo/:bar', ({ params }) => {
        ++called
        assert.equal(params.bar, 'bas', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '/foo/bas')
    await router.start() // called 1
    await router.navigate('/') // not called
    await router.back() // called 2
    await router.forward() // not called
    await router.back() // called 3

    router.stop()
    assert.equal(called, 3, 'matching route should be called for each matching location')
  })
})

describe('Router#start using hash', () => {
  it('routes from the current location.hash', async () => {
    let called = 0
    let router = new Router({ hash: true })
      .use('/foo/:bar', ({ params, resolve }) => {
        ++called
        assert.equal(params.bar, 'bat', 'param bar should be set')
        resolve()
      })

    history.replaceState(null, document.title, '#/foo/bat')
    await router.start()
    router.stop()
    assert.equal(called, 1, 'matching route should be called')
  })

  it('listens to hash changing', async () => {
    let called = 0
    let router = new Router({ hash: true })
      .use('/foo/:bar', ({ params }) => {
        ++called
        assert.equal(params.bar, 'bax', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '#/foo/bax')
    await router.start() // called 1
    await router.navigate('/') // not called
    await router.back() // called 2
    await router.forward() // not called
    await router.back() // called 3

    router.stop()
    assert.equal(called, 3, 'matching route should be called for each matching location')
  })

  it('supports hash routes with pseudo query params', async () => {
    let called = 0
    let router = new Router({ hash: true })
      .use('/login', ({ location }) => {
        ++called
        assert.equal(location.query.foo, 'bar', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '#/login?foo=bar')
    await router.start() // called 1

    router.stop()
    assert.equal(called, 1, 'matching route should be called')
  })

  it('uses the path inside hash', async () => {
    let called = 0
    let router = Router({ hash: '#$!' })
      .use('/path', () => {
        assert.fail('must not match from pathname when hash routing')
      })
      .use(({ path }) => {
        ++called
        assert.equal(path, '/hash/route', 'path must be from hash')
      })
      .use('/hash', Router().use(({ path, location, resolve }) => {
        assert.equal(path, '/route', 'path is relative to mount point')
        assert.equal(location.hash, null, 'hash is empty')
        resolve()
      }))
    history.replaceState(null, document.title, '/path#$!/hash/route')
    await router.start()

    router.stop()
    assert.equal(called, 1, 'matching route should be called')
  })
})

describe('Route middleware arguments on client', () => {
  it('has an exiting promise when listening', async () => {
    let stage = 'before'
    let router = Router({ hash: true })
      .use('/', async ({ exiting, next, resolve }) => {
        assert(exiting instanceof Promise, 'exiting must be a promise when listening')
        await next()
        stage = 'resolved'
        resolve() // call resolve or this will wait indefinitely
        await exiting
        stage = 'after'
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '#/')
    router.start()
    assert.equal(stage, 'before', 'before route promise completes, exiting must not be resolved')

    await router.routing
    assert.equal(stage, 'resolved', 'after route promise completes, exiting must not be resolved')

    await router.navigate('/nowhere')
    assert.equal(stage, 'after', 'after next route, exiting must be resolved')
  })
})
