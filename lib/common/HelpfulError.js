
// monkey patch the Error type to serialise properties to JSON - otherwise we end up with empty objects in the browser.
var err = Error.prototype

Object.defineProperty(err, 'toJSON', {
  value: function () {
    var alt = {}

    Object.getOwnPropertyNames(this).forEach(function (key) {
      alt[key] = this[key]
    }, this)

    if (!alt.message && alt.code) {
      alt.message = alt.code
    }

    return alt
  },
  configurable: true
})
