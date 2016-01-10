var plist = require('plist')
var fs = require('fs')
var path = require('path')
var toEnv = require('./to-env')
var config = require('../../config')

module.exports = function createDaemonPlist (callback) {
  var daemonDirectory = path.resolve(path.join(__dirname, '../../../daemon'))
  var args = []

  args.push(process.execPath)
  args.push(daemonDirectory)

  var env = toEnv(config)

  delete env.DAEMONISE
  delete env.DAEMONIZE

  for (var key in env) {
    env[key] = env[key].toString()
  }

  // see http://launchd.info
  var definition = {
    Label: config.DAEMON_NAME,
    // Program: process.execPath,
    ProgramArguments: args,
    KeepAlive: true,
    UserName: config.DAEMON_USER,
    GroupName: config.DAEMON_GROUP,
    // InitGroups: true,
    RunAtLoad: true,
    StandardOutPath: path.join(config.LOG_DIR, config.DAEMON_NAME + '.out.log'),
    StandardErrorPath: path.join(config.LOG_DIR, config.DAEMON_NAME + '.error.log'),
    EnvironmentVariables: env,
    WorkingDirectory: daemonDirectory
  }

  var walkSync = function (dir, filelist) {
    filelist = filelist || []

    fs.readdirSync(dir).forEach(function (file) {
      var fullPath = path.join(dir, file)

      if (fs.statSync(fullPath).isDirectory() && file.substring(0, 1) !== '.') {
        filelist.push(fullPath)
        walkSync(fullPath, filelist)
      }
    })

    return filelist
  }

  definition.WatchPaths = walkSync(path.resolve(path.join(__dirname, '../../../')))

  var contents = plist.build(definition)

  fs.writeFile('/Library/LaunchDaemons/' + config.DAEMON_NAME + '.plist', contents, {
    mode: parseInt('0644', 8)
  }, callback)
}