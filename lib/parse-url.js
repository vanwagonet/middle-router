/* global document */
'use strict'

var doc = typeof document === 'undefined' ? null : document
var anchor

function parse (url, options) {
  var shouldParseQs = options.shouldParseQs
  var isHashRouting = options.isHashRouting
  var hashPrefix = options.hashPrefix
  var location = doc.location

  if (url) {
    location = anchor || (anchor = doc.createElement('a'))
    location.href = url
    location.href = location.href // help IE do the right thing

    if (isHashRouting) {
      var hashWithoutPrefix = location.hash.split(hashPrefix).slice(1).join('')
      location.href = hashWithoutPrefix
      location.href = location.href // help IE do the right thing
    }
  }

  var pathname = location.pathname
  if (pathname.charAt(0) !== '/') pathname = '/' + pathname

  var query = parseQS(shouldParseQs && location.search)

  return {
    href: location.href,
    protocol: location.protocol,
    host: location.host,
    hostname: location.hostname,
    port: location.port,
    pathname: pathname,
    search: location.search,
    hash: location.hash,
    query: query
  }
}

function parseQS (query) {
  var parsed = {}
  if (!query) return parsed
  var parts = query.slice(1).split('&')
  for (var i = 0, length = parts.length; i < length; ++i) {
    var kvpair = parts[i].split('=')
    var key = decodeURIComponent(kvpair[0])
    var value = decodeURIComponent(kvpair[1])
    if (parsed[key] == null) {
      parsed[key] = value
    } else if (Array.isArray(parsed[key])) {
      parsed[key].push(value)
    } else {
      parsed[key] = [ parsed[key], value ]
    }
  }
  return parsed
}

module.exports = doc ? parse : require('url').parse
