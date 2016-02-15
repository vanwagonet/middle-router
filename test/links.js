/* eslint-env mocha */
import assert from 'power-assert'
import Router from '../lib/router'
import event from 'synthetic-dom-events'

function clickTo (url, prevent) {
  let link = document.body.appendChild(document.createElement('a'))
  link.href = url
  if (prevent) {
    link.addEventListener('click', evt => evt.preventDefault())
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
})
