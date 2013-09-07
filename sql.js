//wrapper to normalize api for mysql, and sqlite-3 database access
var _ = require('underscore');

exports.createMySqlStrategy = function (connection) {
    'use strict';
    var that = {};

    that.query = _.bind(connection.query, connection);

    return that;
};

exports.createSqliteStrategy = function (connection) {
    'use strict';
    var that = {};

    that.query = function (a, b, c) {
        var callback = (_.isFunction(b) ? b : c) || function () {};
        connection.run(a, b, function (err) {
            if(err) {
                callback(err);
            }
            else {
                callback(null, {
                    insertId: this.lastID
                });
            }
        });
    };

    return that;
};