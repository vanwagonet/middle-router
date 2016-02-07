/* eslint-env mocha */
import assert from 'power-assert'
import Router from '../lib/router'
import event from 'synthetic-dom-events'

function once (event) {
  let resolve
  function handle () {
    window.removeEventListener(event, handle, false)
    window.document.removeEventListener(event, handle, false)
    resolve()
  }
  window.addEventListener(event, handle, false)
  window.document.addEventListener(event, handle, false)
  return new Promise(r => resolve = r)
}

function click (node) {
  node.dispatchEvent(event('click', { bubbles: true, cancelable: true }))
}

async function clickLinkTo (url, preventDefault) {
  let clicking = once('click')
  let link = document.createElement('a')
  link.href = url
  if (preventDefault) {
    link.addEventListener('click', evt => evt.preventDefault())
  }
  document.body.appendChild(link)
  click(link)
  await clicking
  document.body.removeChild(link)
}

describe('Router#start', () => {
  it('ignores prevented link clicks', async () => {
    let called = 0
    let router = new Router()
      .use('/start', ({ resolve }) => resolve())
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        assert.fail('should not route due to default prevented')
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    router.start({ routeLinks: true })
    await router.routing

    await clickLinkTo('/linked/location', true)
    await router.routing

    router.stop()
    assert.equal(called, 0, 'matching route should not be called')
  })

  it('listens to link clicks if routeLinks is true', async () => {
    let called = 0
    let router = new Router()
      .use('/start', ({ resolve }) => resolve())
      .use('/linked/:to', ({ params, resolve }) => {
        ++called
        assert.equal(params.to, 'location', 'param to should be set')
        resolve()
      })

    history.replaceState(null, document.title, '/start')
    router.start({ routeLinks: true })
    await router.routing

    await clickLinkTo('/linked/location')
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
    router.start({ routeLinks: true })
    await router.routing

    await clickLinkTo('/linked/location')
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
    let router = new Router()
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
    router.start({ confirm, routeLinks: true })
    await router.routing

    await clickLinkTo('/linked/location')
    await router.routing

    router.stop()
    assert.equal(called, 0, 'matching route should not be called')
    assert.equal(confirmCalled, 1, 'confirm should be called')
    assert.equal(beforeExitCalled, 1, 'beforeExit handler should be called')
  })

  it('confirms exit and reverts url if beforeExit handlers prevents default', async () => {
    let called = 0
    let startCalled = 0
    let confirmCalled = 0
    let beforeExitCalled = 0
    let confirm = message => {
      ++confirmCalled
      assert.equal(message, '', 'the confirm message should be empty')
      return false
    }
    let router = new Router({ hash: '#' })
      .use('/start', ({ resolve, beforeExit }) => {
        ++startCalled
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

    let eventing = once('hashchange')
    location.hash = '#/start'
    await eventing
    router.start({ confirm })
    await router.routing

    eventing = once('hashchange')
    await clickLinkTo('#/linked/location')
    await eventing
    await router.routing

    router.stop()
    assert.equal(location.hash, '#/start', 'change should have been reverted')
    assert.equal(startCalled, 1, 'starting route should be called only once')
    assert.equal(called, 0, 'matching route should not be called')
    assert.equal(confirmCalled, 1, 'confirm should be called')
    assert.equal(beforeExitCalled, 1, 'beforeExit handler should be called')
  })

  it('reverts to the correct location when navigation canceled', async () => {
    let lastTo
    let router = new Router({ hash: '#' })
      .use('/go/:to', ({ params, beforeExit, resolve }) => {
        lastTo = params.to
        beforeExit(evt => evt.preventDefault())
        resolve()
      })

    let eventing = once('hashchange')
    location.hash = '#/go/0'
    await eventing
    router.start({ confirm: () => true })
    await router.routing

    async function go (to, confirm) {
      alert(`go ${to} ${confirm}`)
      router.confirm = () => confirm
      let eventing = once('hashchange')
      await clickLinkTo(to)
      await eventing
      if (!confirm) await null
      await router.routing
    }

    async function historyGo (delta, confirm) {
      alert(`history go ${delta}`)
      router.confirm = () => confirm
      let eventing = once('hashchange')
      history.go(delta)
      await eventing
      if (!confirm) await null
      await router.routing
    }

    await go('#/go/1', true)
    await go('#/go/2', true)

    await go('#/go/3', false)
    assert.equal(location.hash, '#/go/2', 'should revert to 2')
    assert.equal(lastTo, '2', 'should have last run 2')

    await historyGo(-1, true)
    assert.equal(location.hash, '#/go/1', 'should go back to 1')
    assert.equal(lastTo, '1', 'should have last run 1')

    await historyGo(1, true)
    assert.equal(location.hash, '#/go/2', 'should go forward to 2')
    assert.equal(lastTo, '2', 'should have last run 2')

    await go('#/go/1', true)
    await historyGo(-1, true)

    await historyGo(-1, false)
    assert.equal(location.hash, '#/go/2', 'should revert to 2')
    assert.equal(lastTo, '2', 'should have last run 2')
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
    let router = new Router()
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
    router.start({ confirm, routeLinks: true })
    await router.routing

    await clickLinkTo('/linked/location')
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
    let router = new Router()
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
    router.start({ confirm, routeLinks: true })
    await router.routing

    await clickLinkTo('/linked/location')
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
    let router = new Router()
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
    router.start({ confirm, routeLinks: true })
    await router.routing

    await clickLinkTo('/linked/location')
    await router.routing

    await clickLinkTo('/linked/elsewhere')
    await router.routing

    router.stop()
    assert.equal(called, 2, 'matching route should be called since confirmed')
    assert.equal(confirmCalled, 1, 'confirm should be called only once')
    assert.equal(beforeExitCalled, 1, 'beforeExit handler should be called only once')
  })
})
