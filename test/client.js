import test from 'blue-tape'
import Router from '../lib/router'

// run same tests as on server
import './server'

function once(event) {
  let resolve
  window.addEventListener(event, function handle () {
    window.removeEventListener(event, handle, false)
    resolve()
  }, false)
  return new Promise(r => resolve = r)
}

test('Router#start using push/pop stateroutes from the current location.pathname', async t => {
  let routing
  let called = 0
  let router = new Router()
    .on('route', (args, promise) => { routing = promise })
    .use('/foo/:bar', ({ params, resolve }) => {
      ++called
      t.equal(params.bar, 'bar', 'param bar should be set')
      resolve()
    })

  history.replaceState(null, document.title, '/foo/bar')
  router.start().stop()
  await routing
  t.equal(called, 1, 'matching route should be called')
})

test('Router#start listens to popstate events', async t => {
  let routing
  let called = 0
  let router = new Router()
    .on('route', (args, promise) => { routing = promise })
    .use('/foo/:bar', ({ params }) => {
      ++called
      t.equal(params.bar, 'bas', 'param bar should be set')
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
  t.equal(called, 3, 'matching route should be called for each matching location')
})

test('Router#start routes from the current location.hash', async t => {
  let routing
  let called = 0
  let router = new Router({ hash: true })
    .on('route', (args, promise) => { routing = promise })
    .use('/foo/:bar', ({ params, resolve }) => {
      ++called
      t.equal(params.bar, 'bat', 'param bar should be set')
      resolve()
    })

  location.hash = '#/foo/bat'
  router.start().stop()
  await routing
  t.equal(called, 1, 'matching route should be called')
})

test('Router#start listens to hashchange events', async t => {
  let routing
  let called = 0
  let router = new Router({ hash: true })
    .on('route', (args, promise) => { routing = promise })
    .use('/foo/:bar', ({ params }) => {
      ++called
      t.equal(params.bar, 'bax', 'param bar should be set')
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
  t.equal(called, 3, 'matching route should be called for each matching location')
})

test('middleware has an exiting promise when listening', async t => {
  let routing
  let stage = 'before'
  let router = Router({ hash: true })
    .on('route', (args, p) => { routing = p })
    .use('/', async ({ exiting, next, resolve }) => {
      t.ok(exiting instanceof Promise, 'exiting must be a promise when listening')
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
  t.equal(stage, 'before', 'before route promise completes, exiting must not be resolved')

  await routing
  t.equal(stage, 'resolved', 'after route promise completes, exiting must not be resolved')

  eventing = once('hashchange')
  location.hash = '#/nowhere'
  await eventing
  t.equal(stage, 'after', 'after next route, exiting must be resolved')
})

test('Support hash routes with pseudo query params', async t => {
  let routing
  let called = 0
  let router = new Router({ hash: true })
    .on('route', (args, promise) => { routing = promise })
    .use('/login', ({ params }) => {
      ++called
      // t.equal(params.foo, 'bar', 'param bar should be set')
    })
    .use(({ resolve }) => { resolve() })

  let eventing = once('hashchange')
  location.hash = '#/login?foo=bar'
  await eventing
  router.start() // called 1
  await routing

  router.stop()
  t.equal(called, 1, 'matching route should be called')
})
