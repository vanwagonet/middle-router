/* eslint-env browser, mocha */
var expect = require('chai').expect
var Router = require('../lib/router')

var testPopState = !!history.replaceState

describe('Router', function () {
  describe('#constructor', function () {
    it('can be called as a function', function () {
      var router = Router()
      expect(router).to.be.an.instanceof(Router)
      expect(router.hash).to.be.false
    })

    it('can be called as a constructor', function () {
      var router = new Router()
      expect(router).to.be.an.instanceof(Router)
      expect(router.hash).to.be.false
    })
  })

  describe('#use', function () {
    it('returns the router', function () {
      var router = new Router()
      expect(router.use()).to.eql(router)
    })

    it('creates routes for each callback', function () {
      var router = new Router()
        .use(function () {}, function () {})
      expect(router.routes.length).to.eql(2)
    })

    it('accepts a path as the first arg', function () {
      var router = new Router()
        .use('/form', function () {}, function () {})
      expect(router.routes.length).to.eql(2)
      expect(router.routes[0].path).to.eql('/form')
      expect(router.routes[1].path).to.eql('/form')
    })
  })

  describe('#route', function () {
    it('returns the router', function () {
      var router = new Router().use('/', function () {})
      expect(router.route('/')).to.eql(router)
    })

    it('logs an error if no route matches', function () {
      var router = new Router()
      var error = console.error
      var called
      console.error = function (err) {
        expect(err).to.eql('no route matches /')
        called = true
      }
      router.route('/')
      expect(called).to.be.true
      console.error = error
    })

    it('routes through the matching middleware', function () {
      var called = 0
      var router = new Router()
        .use('/foo/:bar', function (ctx, next) {
          ++called
          next()
        })
        .use('/somewhere/else', function () {
          expect().fail('ran non-matching middleware')
        })
        .use('*', function (ctx, next) { ++called && next() })
        .use(function (ctx) { ++called })
      router.route('/foo/bar')
      expect(called).to.eql(3)
    })

    it('has an object containing all the parameters', function () {
      var called = 0
      var router = new Router()
        .use('/foo/:bar', function (ctx, next) {
          ++called
          expect(ctx.params.bar).to.eql('bar')
          next()
        })
        .use(function () {})
      router.route('/foo/bar')
      expect(called).to.eql(1)
    })
  })

  describe('#start', function () {
    (testPopState ? describe : describe.skip)('using push/pop state', function () {
      it('routes from the current location.pathname', function () {
        var called = 0
        var router = new Router()
          .use('/foo/:bar', function (ctx, next) {
            ++called
            expect(ctx.params.bar).to.eql('bar')
            next()
          })
          .use(function () {})

        history.replaceState(null, document.title, '/foo/bar')
        router.start().stop()
        expect(called).to.eql(1)
      })

      it('listens to popstate events', function (done) {
        var called = 0
        var router = new Router()
          .use('/foo/:bar', function (ctx, next) {
            ++called
            expect(ctx.params.bar).to.eql('bas')
            next()
          })
          .use(function () {})

        history.replaceState(null, document.title, '/foo/bas')
        setTimeout(function () {
          router.start() // called 1
          history.pushState(null, document.title, '/') // not called
          setTimeout(function () {
            history.back() // called 2
            setTimeout(function () {
              history.forward() // not called
              setTimeout(function () {
                history.back() // called 3
                setTimeout(function () {
                  router.stop()
                  expect(called).to.eql(3)
                  done()
                }, 10)
              }, 10)
            }, 10)
          }, 10)
        }, 10)
      })
    })

    describe.skip('using hashchange', function () {
      it('routes from the current location.hash', function () {
        var called = 0
        var router = new Router({ hash: true })
          .use('/foo/:bar', function (ctx, next) {
            ++called
            expect(ctx.params.bar).to.eql('bat')
            next()
          })
          .use(function () {})

        location.hash = '#/foo/bat'
        router.start().stop()
        expect(called).to.eql(1)
      })

      it('listens to hashchange events', function (done) {
        var called = 0
        var router = new Router({ hash: true })
          .use('/foo/:bar', function (ctx, next) {
            ++called
            expect(ctx.params.bar).to.eql('bax')
            next()
          })
          .use(function () {})

        location.hash = '#/foo/bax'
        router.start() // called 1
        location.hash = '#/' // not called
        setTimeout(function () {
          history.back() // called 2
          setTimeout(function () {
            history.forward() // not called
            setTimeout(function () {
              history.back() // called 3
              setTimeout(function () {
                router.stop()
                expect(called).to.eql(3)
                done()
              }, 0)
            }, 0)
          }, 0)
        }, 0)
      })
    })
  })

  describe.skip('#routeFromLocation', function () {
    (testPopState ? describe : describe.skip)('using push/pop state', function () {
      it('routes from the current location.pathname', function () {
        var called = 0
        var router = new Router()
          .use('/foo/:bar', function (ctx, next) {
            ++called
            expect(ctx.params.bar).to.eql('baz')
            next()
          })
          .use(function () {})

        history.replaceState(null, document.title, '/foo/baz')
        router.routeFromLocation()
        expect(called).to.eql(1)
      })
    })

    describe('using hashchange', function () {
      it('routes from the current location.hash', function () {
        var called = 0
        var router = new Router({ hash: true })
          .use('/foo/:bar', function (ctx, next) {
            ++called
            expect(ctx.params.bar).to.eql('bay')
            next()
          })
          .use(function () {})

        location.hash = '#/foo/bay'
        router.routeFromLocation()
        expect(called).to.eql(1)
      })
    })
  })
})
