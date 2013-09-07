
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

    that.testQuerySelect = function (test) {
        test.expect(1);
        this.sql.query(
            'SeLECT * FROM TableA',
            function (err, rows) {
                test.deepEqual(rows, [{ id: 2, col: "default"}]);
                test.done();
            }
        );
    };

    //depends on testQuerySelect
    that.testInsert = function (test) {
        test.expect(2);
        var that = this;
        that.sql.query(
            'INSERT INTO TableA (id, col) VALUES (?, ?)',
            [5, 'foo'],
            function (err, insertId) {
                test.strictEqual(insertId, 5, 'returns insert id');
                that.sql.query(
                    'SELECT * FROM TableA WHERE id = 5',
                    function (err, rows) {
                        test.deepEqual(
                            rows, [{ id: 5, col: 'foo' }], 'row is inserted'
                        );
                        test.done();
                    }
                );
            }
        );
    };

    //depends on testQuerySelect
    that.testUpdate = function (test) {
        test.expect(2);
        var that = this;
        that.sql.query(
            'UPDATE TableA SET col="edit" WHERE id = 2',
            function (isSuccess) {
                test.strictEqual(isSuccess, true, 'callback param set to true');
                that.sql.query('SELECT * FROM TableA', function (err, rows) {
                    test.deepEqual(
                        rows, [{ id: 2, col: 'edit' }], 'row is updated'
                    );
                    test.done();
                });
            }
        );
    };

    //depends on testQuerySelect
    that.testDelete = function (test) {
        test.expect(2);
        var that = this;
        that.sql.query(
            'DELETE FROM TableA WHERE id = 2',
            function (isSuccess) {
                test.strictEqual(isSuccess, true, 'callback param set to true');
                that.sql.query('SELECT * FROM TableA', function (err, rows) {
                    test.deepEqual(rows, [], 'row is deleted');
                    test.done();
                });
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


//very gross solution, mysql can only be disconnected once (and test runner wont
//exit untill connection is closed)
setTimeout(function () {
    mysqlConnection.end();
}, 3000);