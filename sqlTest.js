
var sql = require('./sql'),

    _ = require('underscore'),

    sqlite = require('sqlite3').verbose(),
    sqliteConnection,

    mysqlConnection = require('mysql').createConnection({
        host: 'localhost',
        user: 'root',
        password: 'P0l.ar-B3ar',
        database: 'test'
    }),

    createMysqlDatabase = '' +
    'CREATE TABLE TableA (' +
        'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ' +
        'col VARCHAR(64)' +
    ')',

    createSqliteDatabase = '' +
    'CREATE TABLE TableA (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'col VARCHAR(64)' +
    ')';

var createTests = function (fig) {
    'use strict';

    var that = {};

    that.setUp = function (finished) {
        this.sql = fig.setUp();
        finished();
    };

    that.tearDown = function (finished) {
        if(fig.tearDown) {
            fig.tearDown();
        }
        finished();
    };

    that.testInsertId = function (test) {
        test.expect(1);
        this.sql.query(
            'INSERT INTO TableA (id, col) VALUES (?, ?)',
            [5, 'foo'],
            function (err, response) {
                test.equal(response.insertId, 5, 'returns insert id');
                test.done();
            }
        );
    };

    that.testQuerySelect = function (test) {
        test.expect(1);
        this.sql.query(
            'SELECT * FROM TableA',
            function (err, rows) {
                test.ok(true);
                test.done();
            }
        );
    };

    return that;
};


exports.mysql = createTests({
    setUp: function () {
        mysqlConnection.query('DROP TABLE TableA');
        mysqlConnection.query(createMysqlDatabase);
        mysqlConnection.query('INSERT INTO TableA (id, col) VALUES (2, "default")');
        return sql.createMySqlStrategy(mysqlConnection);
    }
});

exports.sqlite3 = createTests({
    setUp: function () {
        sqliteConnection = new sqlite.Database(':memory:');
        sqliteConnection.serialize(function () {
            sqliteConnection.run(createSqliteDatabase);
            sqliteConnection.run('INSERT INTO TableA (id, col) VALUES (2, "default")');
        });
        return sql.createSqliteStrategy(sqliteConnection);
    }
});


//mysqlConnection.end();
