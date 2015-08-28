var Container = require('wantsit').Container
var winston = require('winston')

var container = new Container({
  timeout: 0
})
container.register('dnode', require('boss-dnode'))
container.register('usage', require('usage'))
container.register('posix', require('posix'))
container.register('fs', require('fs'))
container.register('heapdump', require('heapdump'))
container.register('coercer', require('coercer'))
container.register('lag', require('event-loop-lag'))
container.register('logger', new winston.Logger())
container.register('process', process)
container.createAndRegister('remoteProcessLogger', require('../common/RemoteProcessLogger'), [{
  name: 'remote'
}], function (error, logger) {
  if (!error) {
    container.find('logger').add(logger, null, true)
  }
})
container.createAndRegister('consoleDebugLogger', require('../common/ConsoleDebugLogger'), [{
  name: 'console',
  colorize: true
}], function (error, logger) {
  if (!error) {
    container.find('logger').add(logger, null, true)
  }
})
container.createAndRegister('logRedirector', require('../common/LogRedirector'))
container.createAndRegister('parentProcess', require('../common/ParentProcess'))
container.createAndRegister('exceptionHandler', require('../common/ExceptionHandler'))
container.createAndRegister('userInfo', require('../common/UserInfo'))
container.createAndRegister('config', require('../common/ConfigLoader'))
container.createAndRegister('processRpc', require('./ProcessRPC'))
container.createAndRegister('processWrapper', require('./ProcessWrapper'))
container.createAndRegister('latencyMonitor', require('../common/LatencyMonitor'))
