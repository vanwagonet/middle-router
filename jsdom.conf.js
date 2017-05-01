'use strict'
const { JSDOM } = require('jsdom')

const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body></body>
</html>`

const { window } = new JSDOM(html, { url: 'http://example.com/' })
for (const key of Object.keys(window)) {
  if (!(key in global)) global[key] = window[key]
}
global.window = window
