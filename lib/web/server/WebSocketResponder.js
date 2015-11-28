var Autowire = require('wantsit').Autowire
var bcrypt = require('bcrypt')
var remote = require('../../remote')
var OutputBuffer = require('output-buffer')

var WebSocketResponder = function () {
  this._config = Autowire
  this._logger = Autowire
  this._hostList = Autowire
  this._webSocket = Autowire

  this._events = []
}

WebSocketResponder.prototype.afterPropertiesSet = function () {
  this._webSocket.use(function (socket, next) {
    if (this._config.https.enabled && !socket.handshake.secure) {
      return next(new Error('Non-SSL connection'))
    }

    if (!socket.handshake.headers.authorization) {
      return next(new Error('No authorisation attempted'))
    }

    var parts = socket.handshake.headers.authorization.split(/\s+/)

    if (parts[0].toLowerCase() !== 'basic') {
      return next(new Error('Invalid authentication type'))
    }

    if (parts.length !== 2) {
      return next(new Error('Invalid authentication format'))
    }

    var credentialsPart = new Buffer(parts[1], 'base64').toString()
    var sep = credentialsPart.indexOf(':')

    if (sep === -1) {
      return next(new Error('Invalid header internal syntax'))
    }

    var username = credentialsPart.slice(0, sep).trim()
    var password = credentialsPart.slice(sep + 1).trim()

    if (!username) {
      return next(new Error('HTTP authentication header missing username'))
    }

    if (!password) {
      return next(new Error('HTTP authentication header missing password'))
    }

    var user = this._config.users[username]

    if (!user) {
      return next(new Error('Authentication failed'))
    }

    bcrypt.compare(password, user.password, function (error, isValid) {
      if (error) {
        return next(error)
      }

      if (isValid) {
        socket.user = {
          name: username,
          hosts: Object.keys(user).filter(function (key) {
            return key !== 'password'
          })
        }

        return next()
      }

      return next(new Error('Authentication failed'))
    })
  }.bind(this))

  this._webSocket.on('connection', function (client) {
    if (!client.user) {
      return client.conn.close()
    }

    client.on('process:stop', this._checkHost.bind(this, this.stopProcess.bind(this), client))
    client.on('process:start', this._checkHost.bind(this, this.startProcess.bind(this), client))
    client.on('process:restart', this._checkHost.bind(this, this.restartProcess.bind(this), client))
    client.on('process:gc', this._checkHost.bind(this, this.gcProcess.bind(this), client))
    client.on('process:heapdump', this._checkHost.bind(this, this.heapdumpProcess.bind(this), client))
    client.on('process:snapshot:remove', this._checkHost.bind(this, this.removeSnapshot.bind(this), client))
    client.on('process:remove', this._checkHost.bind(this, this.removeProcess.bind(this), client))
    client.on('cluster:addworker', this._checkHost.bind(this, this.addClusterWorker.bind(this), client))
    client.on('cluster:removeworker', this._checkHost.bind(this, this.removeClusterWorker.bind(this), client))
    client.on('app:install', this._checkHost.bind(this, this.installApp.bind(this), client))
    client.on('app:update', this._checkHost.bind(this, this.updateApp.bind(this), client))
    client.on('app:remove', this._checkHost.bind(this, this.removeApp.bind(this), client))
    client.on('app:start', this._checkHost.bind(this, this.startApp.bind(this), client))
    client.on('app:lsrefs', this._checkHost.bind(this, this.listRefs.bind(this), client))
    client.on('app:setref', this._checkHost.bind(this, this.setRef.bind(this), client))
  }.bind(this))

  setInterval(this._processEvents.bind(this), this._config.ws.frequency)
}

WebSocketResponder.prototype._processEvents = function () {
  if (this._events.length === 0) {
    return
  }

  this._events.forEach(function (event) {
    this._webSocket.emit.apply(this._webSocket, event)
  }.bind(this))

  this._events.length = 0
}

WebSocketResponder.prototype.broadcast = function () {
  this._events.push(Array.prototype.slice.call(arguments))
}

WebSocketResponder.prototype._checkHost = function () {
  var target = arguments[0]
  var client = arguments[1]
  var args = arguments[2]
  var callback = arguments[3]

  var host = this._hostList.getHostByName(args.host)

  if (!host || !this._config.hosts[args.host]) {
    return callback(new Error('Unknown host'))
  }

  if (!client || !client.user || !client.user.name) {
    return callback(new Error('Not authenticated'))
  }

  if (!this._config.users[client.user.name][args.host] || !this._config.users[client.user.name][args.host].secret) {
    return callback(new Error('Not authorised'))
  }

  var user = this._config.users[client.user.name][args.host].user || client.user.name

  remote(this._logger, {
    host: host.host,
    port: host.port,
    user: user,
    secret: this._config.users[client.user.name][args.host].secret
  }, function (error, guvnor) {
    if (error) {
      if (guvnor) {
        guvnor.disconnect()
      }

      return
    }

    target({
      client: client
    }, guvnor, args, function () {
      guvnor.disconnect()

      callback.apply(callback, arguments)
    })
  })
}

WebSocketResponder.prototype.startProcess = function (connection, guvnor, args, callback) {
  guvnor.startProcess(args.name, args.options, callback)
}

WebSocketResponder.prototype.stopProcess = function (connection, guvnor, args, callback) {
  guvnor.findProcessInfoById(args.process, function (error, remoteProcess) {
    if (error) {
      return callback(error)
    }

    if (!remoteProcess) {
      return callback()
    }

    remoteProcess.kill(function (error) {
      remoteProcess.disconnect()

      if (error && error.message === 'No method kill defined!') {
        guvnor.stopProcess(remoteProcess.id, function (error) {
          if (error && error.code === 'EPERM') {
            this._logger.error(error.message)
          }

          callback(error)
        }.bind(this))
      } else {
        callback(error)
      }
    })
  })
}

WebSocketResponder.prototype.restartProcess = function (connection, guvnor, args, callback) {
  guvnor.findProcessInfoById(args.process, function (error, remoteProcess) {
    if (error) {
      return callback(error)
    }

    if (!remoteProcess) {
      return callback()
    }

    remoteProcess.restart(function (error) {
      remoteProcess.disconnect()
      callback(error)
    })
  })
}

WebSocketResponder.prototype.removeProcess = function (connection, guvnor, args, callback) {
  guvnor.removeProcess(args.process, callback)
}

WebSocketResponder.prototype.gcProcess = function (connection, guvnor, args, callback) {
  guvnor.findProcessInfoById(args.process, function (error, remoteProcess) {
    if (error) {
      return callback(error)
    }

    if (!remoteProcess) {
      return callback()
    }

    remoteProcess.forceGc(function (error) {
      remoteProcess.disconnect()
      callback(error)
    })
  })
}

WebSocketResponder.prototype.heapdumpProcess = function (connection, guvnor, args, callback) {
  guvnor.findProcessInfoById(args.process, function (error, remoteProcess) {
    if (error) {
      return callback(error)
    }

    if (!remoteProcess) {
      return callback()
    }

    remoteProcess.dumpHeap(function (error) {
      remoteProcess.disconnect()
      callback(error)
    })
  })
}

WebSocketResponder.prototype.removeSnapshot = function (connection, guvnor, args, callback) {
  guvnor.findProcessInfoById(args.process, function (error, remoteProcess) {
    if (error) {
      return callback(error)
    }

    if (!remoteProcess) {
      return callback()
    }

    remoteProcess.removeHeapSnapshot(args.snapshot, function (error) {
      remoteProcess.disconnect()
      callback(error)
    })
  })
}

WebSocketResponder.prototype.addClusterWorker = function (connection, guvnor, args, callback) {
  guvnor.findProcessInfoById(args.process, function (error, remoteProcess) {
    if (error) {
      return callback(error)
    }

    if (!remoteProcess) {
      return callback()
    }

    remoteProcess.setClusterWorkers(remoteProcess.instances + 1, function (error) {
      remoteProcess.disconnect()
      callback(error)
    })
  })
}

WebSocketResponder.prototype.removeClusterWorker = function (connection, guvnor, args, callback) {
  guvnor.findProcessInfoById(args.process, function (error, remoteProcess) {
    if (error) {
      return callback(error)
    }

    if (remoteProcess.instances === 0) {
      return callback()
    }

    remoteProcess.setClusterWorkers(remoteProcess.instances - 1, function (error) {
      remoteProcess.disconnect()
      callback(error)
    })
  })
}

WebSocketResponder.prototype.installApp = function (connection, guvnor, args, callback) {
  var infoBuffer = new OutputBuffer(function (line) {
    connection.client.emit('ws:appinstall:info', line)
  })

  var errorBuffer = new OutputBuffer(function (line) {
    connection.client.emit('ws:appinstall:error', line)
  })

  guvnor.deployApplication(args.name, args.url, infoBuffer.append.bind(infoBuffer), errorBuffer.append.bind(errorBuffer), function (error) {
    infoBuffer.flush()
    errorBuffer.flush()

    return callback(error)
  })
}

WebSocketResponder.prototype.updateApp = function (connection, guvnor, args, callback) {
  var infoBuffer = new OutputBuffer(function (line) {
    connection.client.emit('ws:appupdate:info', line)
  })

  var errorBuffer = new OutputBuffer(function (line) {
    connection.client.emit('ws:appupdate:error', line)
  })

  guvnor.updateApplicationRefs(args.name, infoBuffer.append.bind(infoBuffer), errorBuffer.append.bind(errorBuffer), function (error) {
    infoBuffer.flush()
    errorBuffer.flush()

    return callback(error)
  })
}

WebSocketResponder.prototype.removeApp = function (connection, guvnor, args, callback) {
  guvnor.removeApplication(args.name, callback)
}

WebSocketResponder.prototype.startApp = function (connection, guvnor, args, callback) {
  guvnor.startProcess(args.name, args.options, callback)
}

WebSocketResponder.prototype.listRefs = function (connection, guvnor, args, callback) {
  guvnor.listApplicationRefs(args.name, callback)
}

WebSocketResponder.prototype.setRef = function (connection, guvnor, args, callback) {
  var infoBuffer = new OutputBuffer(function (line) {
    connection.client.emit('ws:setref:info', line)
  })

  var errorBuffer = new OutputBuffer(function (line) {
    connection.client.emit('ws:setref:error', line)
  })

  guvnor.switchApplicationRef(args.name, args.ref, infoBuffer.append.bind(infoBuffer), errorBuffer.append.bind(errorBuffer), function (error) {
    infoBuffer.flush()
    errorBuffer.flush()

    return callback(error)
  })
}

module.exports = WebSocketResponder
