//wrapper to normalize api for mysql, and sqlite-3 database access
var _ = require('underscore');

var extractQueryType = function (statement) {
    return statement.split(' ')[0].toUpperCase();
};

var getCallback = function (args) {
    return (_.isFunction(args[1]) ? args[1] : args[2]) || function () {};
};

exports.createMySqlStrategy = function (connection) {
    'use strict';
    var that = {};

    that.query = function (statement, a, b) {
        var callback = getCallback(arguments);
        a = _.isFunction(a) ? null : a;
        switch(extractQueryType(statement)) {
            case 'SELECT':
                connection.query(statement, a, function (err, rows) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        callback(null, rows);
                    }
                });
                break;
            case 'INSERT':
                connection.query(statement, a, function (err, response) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        callback(null, response.insertId);
                    }
                });
                break;
            case 'UPDATE':
                connection.query(statement, a, function (err) {
                    callback(err ? false : true);
                });
                break;
            case 'DELETE':
                connection.query(statement, a, function (err) {
                    callback(err ? false : true);
                });
                break;
            default:
                throw 'Invalid Query Type';
        }
    };

    return that;
};

exports.createSqliteStrategy = function (connection) {
    'use strict';
    var that = {};

    that.query = function (statement, a, b) {
        var callback = getCallback(arguments);
        switch(extractQueryType(statement)) {
            case 'SELECT':
                connection.all(statement, a, function (err, rows) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        callback(null, rows);
                    }
                });
                break;
            case 'INSERT':
                connection.run(statement, a, function (err) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        callback(null, this.lastID);
                    }
                });
                break;
            case 'UPDATE':
                connection.run(statement, a, function (err) {
                    callback(err ? false : true);
                });
                break;
            case 'DELETE':
                connection.run(statement, a, function (err) {
                    callback(err ? false : true);
                });
                break;
            default:
                throw 'Invalid Query Type';
        }
    };

    return that;
};