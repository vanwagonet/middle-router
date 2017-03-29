// The default url for jsdom is 'about:blank', which causes all url helpers to explode
require('jsdom-global')(null, {
  url: 'http://example.com/'
})
