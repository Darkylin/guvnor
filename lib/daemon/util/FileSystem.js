var Autowire = require('wantsit').Autowire,
  winston = require('winston')

var FileSystem = function() {
  this._config = Autowire
  this._logger = Autowire
  this._posix = Autowire
  this._fs = Autowire
  this._mkdirp = Autowire
}

FileSystem.prototype.afterPropertiesSet = function() {
  this._createDirectorySync(this._config.boss.logdir, 0770)
  this._createDirectorySync(this._config.boss.rundir, 0770)
  this._createDirectorySync(this._config.boss.rundir + '/processes', 0770)
  this._createDirectorySync(this._config.boss.confdir, 0770)
  this._createDirectorySync(this._config.boss.appdir, 0770)
}

FileSystem.prototype.getRunDir = function() {
  return this._config.boss.rundir
}

FileSystem.prototype.getLogDir = function() {
  return this._config.boss.logdir
}

FileSystem.prototype.getConfDir = function() {
  return this._config.boss.confdir
}

FileSystem.prototype._createDirectorySync = function(directory, mode) {
  var gid = this._posix.getgrnam(this._config.boss.group).gid
  var oldmask = process.umask()

  try {
    if(this._fs.existsSync(directory)) {
      return
    }

    this._logger.debug('Creating', directory, 'with mode', mode.toString(8))

    oldmask = process.umask(0)
    this._mkdirp.sync(directory, {
      mode: mode
    })
    process.umask(oldmask)

    this._fs.chownSync(directory, process.getuid(), gid)
  } catch(error) {
    process.umask(oldmask)

    // we've been run as a non-root user
    if (error.code == 'EACCES') {
      this._logger.error('I do not have permission to create', directory, '- please run me as a privileged user.')
      process.exit(-1)
    }

    throw error
  }
}

module.exports = FileSystem