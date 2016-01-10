var async = require('async')
var loadUnitFile = require('./lib/load-unit-file')
var config = require('./config')
var fs = require('fs')
var findProcessStatus = require('./lib/find-process-status')

var DAEMON_PREFIX = config.DAEMON_NAME + '.'
var SERVICE_SUFFIX = '.service'

function endsWith (haystack, needle) {
  return haystack.substring(haystack.length - needle.length) === needle
}

function startsWith (haystack, needle) {
  return haystack.indexOf(needle) === 0
}

module.exports = function systemdListProcesses (context, callback) {
  async.waterfall([
    fs.readdir.bind(fs, config.UNIT_FILE_LOCATIONS),
    function filterNonDaemonFiles (files, next) {
      next(null, files.filter(function fileFilter (file) {
        return startsWith(file, DAEMON_PREFIX) && endsWith(file, SERVICE_SUFFIX)
      }))
    },
    function mapToServiceName (files, next) {
      next(null, files.map(function fileFilter (file) {
        return file.substring(DAEMON_PREFIX.length, file.length - SERVICE_SUFFIX.length)
      }))
    },
    function readFiles (files, next) {
      async.map(files, loadUnitFile, next)
    },
    function findProcessStatuses (units, next) {
      async.map(units, function (unit, done) {
        findProcessStatus(unit.env[config.DAEMON_NAME.toUpperCase() + '_PROCESS_NAME'], function (error, status) {
          unit.status = status

          done(error, unit)
        })
      }, next)
    },
    function convertUnitsToProcesses (units, next) {
      next(null, units.map(function convertUnitToProcess (unit, next) {
        return {
          name: unit.env[config.DAEMON_NAME.toUpperCase() + '_PROCESS_NAME'],
          script: unit.env[config.DAEMON_NAME.toUpperCase() + '_SCRIPT'],
          user: unit.Service.User,
          group: unit.Service.Group,
          status: unit.status
        }
      }))
    }
  ], callback)
}