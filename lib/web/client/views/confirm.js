var View = require('ampersand-view')
var templates = require('../templates')
var AmpersandModel = require('ampersand-model')

var Model = AmpersandModel.extend({
  props: {
    title: 'string',
    message: 'string'
  }
})

module.exports = View.extend({
  template: templates.includes.confirm,
  initialize: function () {
    this.model = new Model()
  },
  bindings: {
    'model.title': '[data-hook=title]',
    'model.message': '[data-hook=message]'
  },
  setTitle: function (title) {
    this.model.title = title
  },
  setMessage: function (message) {
    this.model.message = message
  },
  onYes: function () {
  },
  onNo: function () {
  }
})
