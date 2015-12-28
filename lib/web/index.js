/*
require('colors')
require('../common/HelpfulError.js')

var commander = require('commander')
var pkg = require('../../package.json')
var path = require('path')
var prompt = require('prompt')
var bcrypt = require('bcrypt')
var pem = require('pem')
var fs = require('fs')
var ini = require('ini')
var mkdirp = require('mkdirp')

function loadUserConfig (file) {
  function load (path) {
    try {
      if (fs.existsSync(path)) {
        return ini.parse(fs.readFileSync(path, 'utf-8'))
      }
    } catch (error) {
      if (error.code !== 'EACCES') {
        throw error
      }
    }
  }

  return load('/etc/guvnor/' + file) ||
    load(process.env.HOME + '/.config/guvnor/' + file) ||
    {}
}

function saveUserConfig (file, contents) {
  return writeFileToConfigDirectory(file, ini.stringify(contents))
}

function writeFileToConfigDirectory (file, contents) {
  function write (file) {
    var dir = path.dirname(file)

    try {
      mkdirp.sync(dir, {
        mode: parseInt('0700', 8)
      })

      fs.writeFileSync(file, contents, {
        mode: parseInt('0600', 8)
      })
    } catch (error) {
      if (error.code !== 'EACCES') {
        throw error
      }

      return false
    }

    return file
  }

  return write('/etc/guvnor/' + file) || write(process.env.HOME + '/.config/guvnor/' + file) || false
}

var CLI = function () {}

CLI.prototype.addUser = function (userName) {
  var users = loadUserConfig('guvnor-web-users')

  if (users[userName]) {
    return console.log('A user with the name'.red, userName, 'already exists'.red)
  }

  this._getUserPassword(function (error, password) {
    if (error) {
      throw error
    }

    users[userName] = {
      password: password
    }

    saveUserConfig('guvnor-web-users', users)
  })
}

CLI.prototype.removeUser = function (userName) {
  var users = loadUserConfig('guvnor-web-users')

  delete users[userName]

  if (!saveUserConfig('guvnor-web-users', users)) {
    console.log('Could not remove user'.red, userName)
  }
}

CLI.prototype.changeUserPassword = function (userName) {
  var users = loadUserConfig('guvnor-web-users')

  if (!users[userName]) {
    return console.log('No user with the name'.red, userName, 'exists'.red)
  }

  this._getUserPassword(function (error, password) {
    if (error) {
      throw error
    }

    users[userName].password = password

    saveUserConfig('guvnor-web-users', users)
  })
}

CLI.prototype.listUsers = function () {
  var users = loadUserConfig('guvnor-web-users')
  var userNames = Object.keys(users)

  if (userNames.length === 0) {
    console.info('No users')
  } else {
    userNames.forEach(function (userName) {
      console.log(userName)
    })
  }
}

CLI.prototype.generateSSLCertificate = function (days) {
  days = days || 365

  pem.createCertificate({
    days: days,
    selfSigned: true
  }, function (error, keys) {
    if (error) {
      throw error
    }

    var config = loadUserConfig('guvnor-web')

    config.https = config.https || {}
    config.https.enabled = true
    config.https.key = writeFileToConfigDirectory('ssh.key', keys.serviceKey)
    config.https.certificate = writeFileToConfigDirectory('ssh.cert', keys.certificate)
    config.https.enabled = true

    delete config.https.passphrase

    saveUserConfig('guvnor-web', config)
  })
}

CLI.prototype._getUserPassword = function (callback) {
  prompt.message = ''
  prompt.start()
  prompt.get([{
    name: 'Enter a password (no characters will appear)',
    required: true,
    hidden: true
  }, {
    name: 'Repeat the password',
    required: true,
    hidden: true,
    message: 'Passwords must match',
    conform: function (value) {
      return value === prompt.history('Enter a password (no characters will appear)').value
    }
  }], function (error, result) {
    var password

    if (!error) {
      password = result['Enter a password (no characters will appear)']
      password = bcrypt.hashSync(password, 10)
    }

    callback(error, password)
  })
}

var cli = new CLI()

commander
  .version(pkg.version)

commander
  .command('useradd <username>')
  .alias('adduser')
  .description('Adds a web user')
  .action(cli.addUser.bind(cli))

commander
  .command('rmuser <username>')
  .description('Removes a web user')
  .action(cli.removeUser.bind(cli))

commander
  .command('passwd <username>')
  .description('Sets the password for a web user')
  .action(cli.changeUserPassword.bind(cli))

commander
  .command('lsusers')
  .description('Prints out a list of users')
  .action(cli.listUsers.bind(cli))

commander
  .command('genssl [days]')
  .description('Generates self-signed SSL certificates for guvnor-web that will expire in the passed number of days (defaults to 365)')
  .action(cli.generateSSLCertificate.bind(cli))

var program = commander.parse(process.argv)

// No command, start the webserver
if (program.args.length === 0) {
  var GuvnorWeb = require('./GuvnorWeb')

  var web = new GuvnorWeb()
  web.start()
}
*/

var logger = require('winston')
logger.cli()
logger.level = 'debug'

var startServer = require('./start-server')

startServer(function (error) {
  if (error) {
    throw error
  }
})
