var coercer = require('coercer')
var commonConfig = require('../config')
var config = JSON.parse(JSON.stringify(commonConfig))

config.PLIST_LOCATIONS = process.env.PLIST_LOCATIONS || '/Library/LaunchDaemons'
config.LAUNCHCTL_PATH = process.env.LAUNCHCTL_PATH || '/bin/launchctl'
config.NEWSYSLOGD_PATH = process.env.NEWSYSLOGD_PATH || '/etc/newsyslog.d'

module.exports = Object.freeze(coercer(config))