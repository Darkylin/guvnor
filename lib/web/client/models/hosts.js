var Collection = require('ampersand-collection')
var Host = require('./host')

module.exports = Collection.extend({
  mainIndex: 'name',
  model: Host,
  comparator: 'name'
})
