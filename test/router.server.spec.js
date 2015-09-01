/* eslint-env mocha */
var expect = require('chai').expect
var Router = require('../lib/router')

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

    it('passes the state in the context', function () {
      var called = 0
      var state = { foo: 'bar' }
      var router = new Router()
        .use('/foo/:bar', function (ctx, next) {
          ++called
          expect(ctx.state).to.eql(state)
          next()
        })
        .use(function () {})
      router.route('/foo/bar', state)
      expect(called).to.eql(1)
    })

    it('passes parameters to nested routers', function () {
      var called = 0
      var router = new Router()
        .use('/:foo', new Router()
          .use('/', function (ctx, next) {
            ++called
            expect(ctx.params.foo).to.eql('foo')
            next()
          })
        )
        .use(function () {})
      router.route('/foo/')
      expect(called).to.eql(1)
    })

    it('routes through arbitrarily deep nested routers', function () {
      var called = 0
      var router = Router()
        .use('/:foo', Router().use(Router().use(Router()
          .use('/bar', Router().use(Router()
            .use('/:baz', function (ctx, next) {
              ++called
              expect(ctx.params.foo).to.eql('foo')
              expect(ctx.params.baz).to.eql('bar')
              next()
            })
          ))
        )))
        .use(function () {})
      router.route('/foo/bar/bar')
      expect(called).to.eql(1)
    })
  })
})
