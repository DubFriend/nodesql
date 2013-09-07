//wrapper to normalize api for mysql, and sqlite-3 database access
var _ = require('./../public/js/lib/underscore');

exports.createMySqlStrategy = function (connection) {
    'use strict';
    var that = {};

    that.query = _.bind(connection.query, connection);

    return that;
};

exports.createSqliteStrategy = function (connection) {
    'use strict';
    var that = {};

    that.query = _.bind(connection.run, connection);

    return that;
};