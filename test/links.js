/* eslint-env mocha */
import assert from 'power-assert'
import Router from '../lib/router'
import event from 'synthetic-dom-events'

function clickTo (url, prevent, attributes) {
  let link = document.body.appendChild(document.createElement('a'))
  link.href = url
  if (prevent) {
    link.addEventListener('click', evt => evt.preventDefault())
  }
  if (attributes) {
    Object.keys(attributes).forEach(name => link.setAttribute(name, attributes[name]))
  }
  link.dispatchEvent(event('click', { bubbles: true, cancelable: true }))
  document.body.removeChild(link)
}

describe('Router#routeLinks', () => {
  it('ignores prevented link clicks', async () => {
    let called = 0
    let router = new Router({ routeLinks: true })
      .use('/start', ({ resolve }) => resolve())
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        assert.fail('should not route due to default prevented')
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    clickTo('/linked/location', true)
    await router.routing

    router.stop()
    assert.equal(called, 0, 'matching route should not be called')
  })

  it('ignores links that have a target attribute', async () => {
    let called = 0
    let router = new Router({ routeLinks: true })
      .use('/start', ({ resolve }) => resolve())
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        assert.fail('should not route due to target attribute')
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    clickTo('#/linked/location', false, { target: '_self' })
    await router.routing

    router.stop()
    assert.equal(called, 0, 'matching route should not be called')
  })

  it('ignores links that have a download attribute', async () => {
    let called = 0
    let router = new Router({ hash: '#', routeLinks: true })
      .use('/start', ({ resolve, }) => resolve())
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        assert.fail('should not route due to download attribute')
      })

    window.location.hash = '#/start'
    await router.start()

    clickTo('#/linked/location', false, { download: true })
    await router.routing

    router.stop()
    assert.equal(called, 0, 'matching route should not be called')
  })

  it('listens to link clicks if routeLinks is true', async () => {
    let called = 0
    let router = new Router({ routeLinks: true })
      .use('/start', ({ resolve }) => resolve())
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        assert.equal(params.to, 'location', 'param to should be set')
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    clickTo('/linked/location')
    await router.routing

    router.stop()
    assert.equal(called, 1, 'matching route should be called')
  })

  it('correctly identifies the link href', async () => {
    let called = 0
    let router = new Router({ routeLinks: true })
      .use('/start', ({ resolve }) => resolve())
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        assert.equal(params.to, 'location', 'param to should be set')
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    let link = document.body.appendChild(document.createElement('a'))
    link.href = '/linked/location'
    let img = document.createElement('img')
    img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
    link.appendChild(img)
    img.dispatchEvent(event('click', { bubbles: true, cancelable: true }))
    document.body.removeChild(link)
    await router.routing

    router.stop()
    assert.equal(called, 1, 'matching route should be called')
  })

  it('triggers beforeExit handlers on link clicks', async () => {
    let called = 0
    let beforeExitCalled = 0
    let router = new Router()
      .use('/start', ({ resolve, beforeExit }) => {
        beforeExit(evt => {
          ++beforeExitCalled
          assert.equal(typeof evt, 'object', 'beforeExit should pass an event object')
          assert.equal(evt.type, 'beforeexit', 'beforeExit event object is of type "beforeexit"')
        })
        resolve()
      })
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    clickTo('/linked/location')
    await router.routing

    router.stop()
    assert.equal(called, 1, 'matching route should be called')
    assert.equal(beforeExitCalled, 1, 'beforeExit handler should be called')
  })

  it('confirms exit if beforeExit handlers prevents default', async () => {
    let called = 0
    let confirmCalled = 0
    let beforeExitCalled = 0
    let confirm = message => {
      ++confirmCalled
      assert.equal(message, '', 'the confirm message should be empty')
      return false
    }
    let router = new Router({ confirm })
      .use('/start', ({ resolve, beforeExit }) => {
        beforeExit(evt => {
          ++beforeExitCalled
          evt.preventDefault()
        })
        resolve()
      })
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    clickTo('/linked/location')
    await router.routing

    router.stop()
    assert.equal(called, 0, 'matching route should not be called')
    assert.equal(confirmCalled, 1, 'confirm should be called')
    assert.equal(beforeExitCalled, 1, 'beforeExit handler should be called')
  })

  it('reverts to the correct location when navigation canceled', async () => {
    let called = 0
    let lastTo
    let router = new Router({ hash: '#', confirm: () => true })
      .use('/go/:to', ({ params, beforeExit, resolve }) => {
        ++called
        lastTo = params.to
        beforeExit(evt => evt.preventDefault())
        resolve()
      })

    history.replaceState(null, document.title, '#/go/0')
    await router.start() // called 1

    async function go (to, confirm) {
      router.confirm = () => confirm
      await clickTo(to)
      await router.routing
    }

    async function back (confirm) {
      router.confirm = () => confirm
      await router.back()
    }

    async function forward (confirm) {
      router.confirm = () => confirm
      await router.forward()
    }

    await go('#/go/1', true) // called 2
    await go('#/go/2', true) // called 3

    // hits prevention logic in navigate
    await go('#/go/3', false)
    assert.equal(location.hash, '#/go/2', 'should stay on 2')
    assert.equal(lastTo, '2', 'should have last run 2')
    assert.equal(called, 3, 'route should not be called when prevented')

    await back(true) // called 4
    assert.equal(location.hash, '#/go/1', 'should go back to 1')
    assert.equal(lastTo, '1', 'should have last run 1')
    assert.equal(called, 4, 'route should run on confirmed back')

    await forward(true) // called 5
    assert.equal(location.hash, '#/go/2', 'should go forward to 2')
    assert.equal(lastTo, '2', 'should have last run 2')
    assert.equal(called, 5, 'route should run on confirmed forward')

    await go('#/go/1', true) // called 6
    assert.equal(location.hash, '#/go/1', 'should go to 1')
    assert.equal(lastTo, '1', 'should have last run 1')
    assert.equal(called, 6, 'route should run on confirmed navigation')

    await back(true) // called 7
    assert.equal(location.hash, '#/go/2', 'should go back to 2')
    assert.equal(lastTo, '2', 'should have last run 2')
    assert.equal(called, 7, 'route should run on confirmed back')

    // hits revert logic in didPopState
    await back(false)
    assert.equal(location.hash, '#/go/2', 'should revert to 2')
    assert.equal(lastTo, '2', 'should have last run 2')
    assert.equal(called, 7, 'route should not be called when reverted')

    await forward(false)
    assert.equal(location.hash, '#/go/2', 'should revert to 2')
    assert.equal(lastTo, '2', 'should have last run 2')
    assert.equal(called, 7, 'route should not be called when reverted')

    router.stop()
  })

  it('confirms exit if beforeExit handlers sets a returnValue', async () => {
    let called = 0
    let confirmCalled = 0
    let beforeExitCalled = 0
    let confirm = message => {
      ++confirmCalled
      assert.equal(message, 'U Shure?', 'the confirm message should be set')
      return true
    }
    let router = new Router({ confirm })
      .use('/start', ({ resolve, beforeExit }) => {
        beforeExit(evt => {
          ++beforeExitCalled
          evt.returnValue = 'U Shure?'
        })
        resolve()
      })
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    clickTo('/linked/location')
    await router.routing

    router.stop()
    assert.equal(called, 1, 'matching route should be called since confirmed')
    assert.equal(confirmCalled, 1, 'confirm should be called')
    assert.equal(beforeExitCalled, 1, 'beforeExit handler should be called')
  })

  it('confirms exit if beforeExit handlers returns a confirm message', async () => {
    let called = 0
    let confirmCalled = 0
    let beforeExitCalled = 0
    let confirm = message => {
      ++confirmCalled
      assert.equal(message, 'U Shure?', 'the confirm message should be set')
      return true
    }
    let router = new Router({ confirm })
      .use('/start', ({ resolve, beforeExit }) => {
        beforeExit(evt => {
          ++beforeExitCalled
          return 'U Shure?'
        })
        resolve()
      })
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    clickTo('/linked/location')
    await router.routing

    router.stop()
    assert.equal(called, 1, 'matching route should be called since confirmed')
    assert.equal(confirmCalled, 1, 'confirm should be called')
    assert.equal(beforeExitCalled, 1, 'beforeExit handler should be called')
  })

  it('removes beforeExit handlers after confirming exit', async () => {
    let called = 0
    let confirmCalled = 0
    let beforeExitCalled = 0
    let confirm = message => {
      ++confirmCalled
      return true
    }
    let router = new Router({ confirm })
      .use('/start', ({ resolve, beforeExit }) => {
        beforeExit(evt => {
          ++beforeExitCalled
          evt.preventDefault()
        })
        resolve()
      })
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    await router.start()

    clickTo('/linked/location')
    await router.routing

    clickTo('/linked/elsewhere')
    await router.routing

    router.stop()
    assert.equal(called, 2, 'matching route should be called since confirmed')
    assert.equal(confirmCalled, 1, 'confirm should be called only once')
    assert.equal(beforeExitCalled, 1, 'beforeExit handler should be called only once')
  })
})
