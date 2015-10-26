'use strict'

module.exports = function clone (object) {
  var copy = {}
  var keys = Object.keys(object)
  for (var i = 0, ii = keys.length; i < ii; ++i) {
    copy[keys[i]] = object[keys[i]]
  }
  return copy
}
