/* eslint-env mocha */
import assert from 'power-assert'
import Router from '../lib/router'

// run same tests as on server
import './server'
import './links'

function once (event) {
  let resolve
  window.addEventListener(event, function handle () {
    window.removeEventListener(event, handle, false)
    resolve()
  }, false)
  return new Promise(r => resolve = r)
}

describe('Router#start using push/pop state', () => {
  it('routes from the current location.pathname', async () => {
    let routing
    let called = 0
    let router = new Router()
      .on('route', (args, promise) => { routing = promise })
      .use('/foo/:bar', ({ params, resolve }) => {
        ++called
        assert.equal(params.bar, 'bar', 'param bar should be set')
        resolve()
      })

    history.replaceState(null, document.title, '/foo/bar')
    router.start().stop()
    await routing
    assert.equal(called, 1, 'matching route should be called')
  })

  it('listens to popstate events', async () => {
    let routing
    let called = 0
    let router = new Router()
      .on('route', (args, promise) => { routing = promise })
      .use('/foo/:bar', ({ params }) => {
        ++called
        assert.equal(params.bar, 'bas', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '/foo/bas')
    router.start() // called 1
    await routing

    history.pushState(null, document.title, '/') // doesn't trigger an event
    router.route(location.href) // not called
    await routing

    let eventing = once('popstate')
    history.back() // called 2
    await eventing
    await routing

    eventing = once('popstate')
    history.forward() // not called
    await eventing
    await routing

    eventing = once('popstate')
    history.back() // called 3
    await eventing
    await routing

    router.stop()
    assert.equal(called, 3, 'matching route should be called for each matching location')
  })
})

describe('Router#start using hash', () => {
  it('routes from the current location.hash', async () => {
    let routing
    let called = 0
    let router = new Router({ hash: true })
      .on('route', (args, promise) => { routing = promise })
      .use('/foo/:bar', ({ params, resolve }) => {
        ++called
        assert.equal(params.bar, 'bat', 'param bar should be set')
        resolve()
      })

    location.hash = '#/foo/bat'
    router.start().stop()
    await routing
    assert.equal(called, 1, 'matching route should be called')
  })

  it('listens to hashchange events', async () => {
    let routing
    let called = 0
    let router = new Router({ hash: true })
      .on('route', (args, promise) => { routing = promise })
      .use('/foo/:bar', ({ params }) => {
        ++called
        assert.equal(params.bar, 'bax', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    let eventing = once('hashchange')
    location.hash = '#/foo/bax'
    await eventing
    router.start() // called 1
    await routing

    eventing = once('hashchange')
    location.hash = '#/' // not called
    await eventing // give time for hashchange event to fire
    await routing

    eventing = once('hashchange')
    history.back() // called 2
    await eventing
    await routing

    eventing = once('hashchange')
    history.forward() // not called
    await eventing
    await routing

    eventing = once('hashchange')
    history.back() // called 3
    await eventing
    await routing

    router.stop()
    assert.equal(called, 3, 'matching route should be called for each matching location')
  })

  it('supports hash routes with pseudo query params', async () => {
    let routing
    let called = 0
    let router = new Router({ hash: true })
      .on('route', (args, promise) => { routing = promise })
      .use('/login', ({ location }) => {
        ++called
        assert.equal(location.query.foo, 'bar', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    let eventing = once('hashchange')
    location.hash = '#/login?foo=bar'
    await eventing
    router.start() // called 1
    await routing

    router.stop()
    assert.equal(called, 1, 'matching route should be called')
  })

  it('uses the path inside hash', async () => {
    let router = Router({ hash: '#$!' })
      .use('/path', () => {
        assert.fail('must not match from pathname when hash routing')
      })
      .use(({ path }) => {
        assert.equal(path, '/hash/route', 'path must be from hash')
      })
      .use('/hash', Router().use(({ path, location, resolve }) => {
        assert.equal(path, '/route', 'path is relative to mount point')
        assert.equal(location.hash, '', 'hash is empty')
        resolve()
      }))
    await router.route('/path#$!/hash/route')
  })
})

describe('Route middleware arguments on client', () => {
  it('has an exiting promise when listening', async () => {
    let routing
    let stage = 'before'
    let router = Router({ hash: true })
      .on('route', (args, p) => { routing = p })
      .use('/', async ({ exiting, next, resolve }) => {
        assert(exiting instanceof Promise, 'exiting must be a promise when listening')
        await next()
        stage = 'resolved'
        resolve() // call resolve or this will wait indefinitely
        await exiting
        stage = 'after'
      })
      .use(({ resolve }) => { resolve() })

    let eventing = once('hashchange')
    location.hash = '#/'
    await eventing

    router.start()
    assert.equal(stage, 'before', 'before route promise completes, exiting must not be resolved')

    await routing
    assert.equal(stage, 'resolved', 'after route promise completes, exiting must not be resolved')

    eventing = once('hashchange')
    location.hash = '#/nowhere'
    await eventing
    assert.equal(stage, 'after', 'after next route, exiting must be resolved')
  })
})
