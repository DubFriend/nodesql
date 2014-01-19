//https://github.com/DubFriend/nodesql

var _ = require('underscore'),
    Q = require('q');

//gets the first word of a sentence.
var extractQueryType = function (statement) {
    'use strict';
    return statement.split(' ')[0].toUpperCase();
};

//gets callback from functions where callback may be either the second or third parameter
var getCallback = function (args) {
    'use strict';
    return (_.isFunction(args[1]) ? args[1] : args[2]) || function () {};
};

//returns an array of given length,
//with all values initialized to the given value
var pad = function (length, value) {
    'use strict';
    var i, array = [];
    for(i = 0; i < length; i += 1) {
        array[i] = value;
    }
    return array;
};

var error = {
    unique: function (indexName) {
        'use strict';
        return {
            code: 'UNIQUE',
            indexName: indexName,
            message: 'Duplicate entry for ' + indexName + ' allready exists'
        };
    }
};

var promiseRespond = function (def, err, res) {
    'use strict';
    if(err) {
        def.reject(err);
    }
    else {
        def.resolve(res);
    }
};

var respond = function (def, callback, err, res) {
    'use strict';
    callback(err, res);
    promiseRespond(def, err, res);
};




var createBaseStrategy = function (fig) {
    'use strict';
    var equalsToSql = function (whereEqualsKeys) {
            return _.map(whereEqualsKeys, function (key) {
                return fig.escape(key) + ' = ?';
            }).join(' AND ');
        },

        select = function (context, table, a, b) {
            var whereEquals, callback;
            if(_.isObject(a) && !_.isFunction(a)) {
                whereEquals = a;
                callback = b;
                context.query(
                    "SELECT * FROM " + fig.escape(table) +
                    " WHERE " + equalsToSql(_.keys(whereEquals)),
                    _.values(whereEquals),
                    callback
                );
            }
            else {
                callback = _.isFunction(a) ? a : b;
                context.query(
                    "SELECT * FROM " + fig.escape(table),
                    callback
                );
            }
        },

        getSelectOneRowsParameter = function (err, rows) {
            return err ? undefined : rows.length === 0 ? null : rows[0];
        },

        that = {};

    that.one = function (statement, a, b) {
        var def = Q.defer(),
            callback = getCallback(arguments);

        a = _.isFunction(a) ? [] : a;
        this.query(statement, a, function (err, rows) {
            respond(def, callback, err, getSelectOneRowsParameter(err, rows));
        });
        return def.promise;
    };

    that.select = function (table, whereEquals, callback) {
        callback = callback || function () {};
        var def = Q.defer();
        select(this, table, whereEquals, _.partial(respond, def, callback));
        return def.promise;
    };

    that.selectOne = function (table, whereEquals, callback) {
        callback = callback || function () {};
        var def = Q.defer();
        select(this, table, whereEquals, function (err, rows) {
            respond(def, callback, err, getSelectOneRowsParameter(err, rows));
        });

        return def.promise;
    };

    that.insert = function (table, values, callback) {
        callback = callback || function () {};
        var def = Q.defer();
        this.query(
            'INSERT INTO ' + fig.escape(table) + ' (' + _.map(
                _.keys(values),
                fig.escape
            ).join(', ') + ') ' +
            'VALUES (' + pad(_.values(values).length, '?').join(', ') + ')',
            _.values(values),
            _.partial(respond, def, callback)
        );
        return def.promise;
    };

    that.update = function (table, values, whereEquals, callback) {
        callback = callback || function () {};
        var def = Q.defer();
        this.query(
            'UPDATE ' + fig.escape(table) + ' SET ' + equalsToSql(_.keys(values)) + ' ' +
            'WHERE ' + equalsToSql(_.keys(whereEquals)),
            _.values(values).concat(_.values(whereEquals)),
            _.partial(respond, def, callback)
        );
        return def.promise;
    };

    that.delete = function (table, whereEquals, callback) {
        callback = callback || function () {};
        var def = Q.defer();
        this.query(
            'DELETE FROM ' + fig.escape(table) + ' WHERE ' + equalsToSql(_.keys(whereEquals)),
            _.values(whereEquals),
            _.partial(respond, def, callback)
        );
        return def.promise;
    };

    return that;

};




exports.createMySqlStrategy = function (connection, mysql) {
    'use strict';
    var that = createBaseStrategy({
            escape: function (value) {
                return mysql.escapeId(value);
            }
        }),

        extractIndexNameFromMessage = function (message) {
            return _.last(message.split(' ')).replace(/'/g, '');
        },

        adaptError = function (err) {
            var adapted;
            if(err) {
                switch(err.code) {
                    case 'ER_DUP_ENTRY':
                        adapted = error.unique(
                            extractIndexNameFromMessage(err.toString())
                        );
                        break;
                    default:
                        adapted = err;
                }
            }
            else {
                adapted = null;
            }
            return adapted;
        };

    that.escape = function (value) {
        return mysql.escape(value);
    };

    that.escapeId = function (value) {
        return mysql.escapeId(value);
    };

    that.transaction = function (statements, callback) {
        var def = Q.defer();
        var sql = 'START TRANSACTION;';
        _.each(statements, function (statement) {
            sql += statement + ';';
        });
        sql += 'COMMIT;';
        connection.query(sql, _.partial(respond, def, callback || function () {}));
        return def.promise;
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
                //defaultQuery();
                throw 'Invalid Query Type';
        }

        return def.promise;
    };

    return that;
};





exports.createSqliteStrategy = function (connection) {
    'use strict';
    var that = createBaseStrategy({
            escape: _.identity
        }),

        extractIndexNameFromMessage = function (message) {
            return message.split(' ')[3];
        },

        adaptError = function (err) {
            var adapted, message;
            if(err) {
                message = err.toString();
                if(_.last(message.split(' ')) === 'unique') {
                    adapted = error.unique(extractIndexNameFromMessage(message));
                }
                else {
                    adapted = err;
                }
            }
            else {
                adapted = null;
            }
            return adapted;
        };

    that.escape = _.identity;
    that.escapeId = _.identity;

    that.transaction = function (statements, callback) {
        var def = Q.defer();
        var sql = 'BEGIN TRANSACTION;';
        _.each(statements, function (statement) {
            sql += statement + ';';
        });
        sql += 'COMMIT;';
        connection.exec(sql, _.partial(respond, def, callback || function () {}));
        return def.promise;
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
                //defaultQuery();
                throw 'Invalid Query Type';
        }

        return def.promise;
    };

    return that;
};
