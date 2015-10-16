var ProcessPage = require('../process')
var templates = require('../../templates')
var StopButton = require('../../buttons/stop')
var RestartButton = require('../../buttons/restart')
var DebugButton = require('../../buttons/debug')

module.exports = ProcessPage.extend({
  template: templates.pages.process.unresponsive,
  subviews: {
    stopButton: {
      container: '[data-hook=stopbutton]',
      prepareView: function (el) {
        return new StopButton({
          el: el,
          model: this.model
        })
      }
    },
    restartButton: {
      container: '[data-hook=restartbutton]',
      prepareView: function (el) {
        return new RestartButton({
          el: el,
          model: this.model
        })
      }
    },
    debugButton: {
      container: '[data-hook=debugbutton]',
      prepareView: function (el) {
        return new DebugButton({
          el: el,
          model: this.model
        })
      }
    }
  }
})
