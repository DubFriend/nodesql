var _ = require('underscore'),
    Q = require('q');

//gets the first word of a sentence.
var extractQueryType = function (statement) {
    return statement.split(' ')[0].toUpperCase();
};

//gets callback from functions where callback may be either the second or third parameter
var getCallback = function (args) {
    return (_.isFunction(args[1]) ? args[1] : args[2]) || function () {};
};

//returns an array of given length,
//with all values initialized to the given value
var pad = function (length, value) {
    var i, array = [];
    for(i = 0; i < length; i += 1) {
        array[i] = value;
    }
    return array;
};

var error = {
    unique: function (column) {
        return {
            code: 'UNIQUE',
            column: column,
            message: 'Duplicate entry for ' + column + ' allready exists'
        };
    },
    default: function () {
        return {
            code: 'DEFAULT',
            message: 'Something went wrong.'
        };
    }
};

var promiseRespond = function (def, err, res) {
    if(err) {
        def.reject(err);
    }
    else {
        def.resolve(res);
    }
};

var respond = function (def, callback, err, res) {
    callback(err, res);
    promiseRespond(def, err, res);
};




var baseStrategy = (function () {
    'use strict';
    var equalsToSql = function (whereEqualsKeys) {
            return _.map(whereEqualsKeys, function (key) {
                return key + ' = ?';
            }).join(', ');
        },

        select = function (context, table, whereEquals, callback) {
            context.query(
                "SELECT * FROM " + table + " WHERE " + equalsToSql(_.keys(whereEquals)),
                _.values(whereEquals),
                callback
            );
        },

        getSelectOneRowsParameter = function (err, rows) {
            return err ? undefined : rows.length === 0 ? null : rows[0];
        };

    return {
        one: function (statement, a, b) {
            var def = Q.defer(),
                callback = getCallback(arguments);

            a = _.isFunction(a) ? [] : a;
            this.query(statement, a, function (err, rows) {
                respond(def, callback, err, getSelectOneRowsParameter(err, rows));
            });

            return def.promise;
        },

        select: function (table, whereEquals, callback) {
            callback = callback || function () {};
            var def = Q.defer();
            select(this, table, whereEquals, _.partial(respond, def, callback));
            return def.promise;
        },

        selectOne: function (table, whereEquals, callback) {
            callback = callback || function () {};
            var def = Q.defer();
            select(this, table, whereEquals, function (err, rows) {
                respond(def, callback, err, getSelectOneRowsParameter(err, rows));
            });

            return def.promise;
        },

        insert: function (table, values, callback) {
            callback = callback || function () {};
            var def = Q.defer();
            this.query(
                'INSERT INTO ' + table + '(' + _.keys(values).join(', ') + ') ' +
                'VALUES (' + pad(_.values(values).length, '?').join(', ') + ')',
                _.values(values),
                _.partial(respond, def, callback)
            );
            return def.promise;
        },

        update: function (table, values, whereEquals, callback) {
            callback = callback || function () {};
            var def = Q.defer();
            this.query(
                'UPDATE ' + table + ' SET ' + equalsToSql(_.keys(values)) + ' ' +
                'WHERE ' + equalsToSql(_.keys(whereEquals)),
                _.values(values).concat(_.values(whereEquals)),
                _.partial(respond, def, callback)
            );
            return def.promise;
        },

        delete: function (table, whereEquals, callback) {
            callback = callback || function () {};
            var def = Q.defer();
            this.query(
                'DELETE FROM ' + table + ' WHERE ' + equalsToSql(_.keys(whereEquals)),
                _.values(whereEquals),
                _.partial(respond, def, callback)
            );
            return def.promise;
        }
    };
}());




exports.createMySqlStrategy = function (connection) {
    'use strict';
    var that = Object.create(baseStrategy),

        extractColumnFromMessage = function (message) {
            return _.last(message.split(' ')).replace(/'/g, '');
        },

        adaptError = function (err) {
            var adapted;
            if(err) {
                switch(err.code) {
                    case 'ER_DUP_ENTRY':
                        adapted = error.unique(
                            extractColumnFromMessage(err.toString())
                        );
                        break;
                    default:
                        adapted = error.default();
                }
            }
            else {
                adapted = null;
            }
            return adapted;
        };

    that.query = function (statement, a, b) {
        var def = Q.defer(),
            data = _.isFunction(a) ? [] : a,
            callback = getCallback(arguments),
            query = _.bind(connection.query, connection, statement, data),
            defaultQuery = _.partial(query, _.partial(respond, def, callback));

        switch(extractQueryType(statement)) {
            case 'SELECT':
                defaultQuery();
                break;
            case 'INSERT':
                query(function (err, response) {
                    var adaptedError = adaptError(err),
                        id = adaptedError ? undefined : response.insertId;
                    callback(adaptedError, id);
                    promiseRespond(def, adaptedError, id);
                });
                break;
            case 'UPDATE':
                defaultQuery();
                break;
            case 'DELETE':
                defaultQuery();
                break;
            default:
                throw 'Invalid Query Type';
        }

        return def.promise;
    };

    return that;
};





exports.createSqliteStrategy = function (connection) {
    'use strict';
    var that = Object.create(baseStrategy),

        extractColumnFromMessage = function (message) {
            return message.split(' ')[3];
        },

        adaptError = function (err) {
            var adapted, message;
            if(err) {
                message = err.toString();
                if(_.last(message.split(' ')) === 'unique') {
                    adapted = error.unique(extractColumnFromMessage(message));
                }
                else {
                    adapted = error.default();
                }
            }
            else {
                adapted = null;
            }
            return adapted;
        };

    that.query = function (statement, a, b) {
        var def = Q.defer(),
            data = _.isFunction(a) ? [] : a,
            callback = getCallback(arguments),
            query = _.bind(connection.run, connection, statement, data),
            defaultQuery = _.partial(query, _.partial(respond, def, callback));

        switch(extractQueryType(statement)) {
            case 'SELECT':
                connection.all(statement, data, _.partial(respond, def, callback));
                break;
            case 'INSERT':
                query(function (err) {
                    var adaptedError = adaptError(err),
                        id = adaptedError ? undefined : this.lastID;
                    callback(adaptedError, id);
                    promiseRespond(def, adaptedError, id);
                });
                break;
            case 'UPDATE':
                defaultQuery();
                break;
            case 'DELETE':
                defaultQuery();
                break;
            default:
                throw 'Invalid Query Type';
        }

        return def.promise;
    };

    return that;
};
