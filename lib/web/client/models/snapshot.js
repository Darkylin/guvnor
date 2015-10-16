var AmpersandModel = require('ampersand-model')
var prettysize = require('prettysize')
var moment = require('moment')

module.exports = AmpersandModel.extend({
  props: {
    id: 'string',
    date: 'number',
    path: 'string',
    size: 'number'
  },
  derived: {
    sizeFormatted: {
      deps: ['string'],
      fn: function () {
        return prettysize(this.size)
      }
    },
    dateFormatted: {
      deps: ['date'],
      fn: function () {
        var date = new Date(this.date)

        return moment(date).format('YYYY-MM-DD HH:mm:ss Z')
      }
    }
  }
})
