var sql = require('./nodesql'),

    _ = require('underscore'),

    sqlite = require('sqlite3').verbose(),
    sqliteConnection,

    mysqlConnection = require('mysql').createConnection({
        host: 'localhost',
        user: 'root',
        password: 'P0l.ar-B3ar',
        database: 'test'
    }),

    createMysqlDatabaseStatement = '' +
    'CREATE TABLE TableA (' +
        'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ' +
        'col VARCHAR(64)' +
    ')',

    createSqliteDatabaseStatement = '' +
    'CREATE TABLE TableA (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'col VARCHAR(64)' +
    ')',

    defaultRowStatement = 'INSERT INTO TableA (id, col) VALUES (2, "default")';


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
    that.testQueryInsert = function (test) {
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
    that.testQueryUpdate = function (test) {
        test.expect(2);
        var that = this;
        that.sql.query(
            'UPDATE TableA SET col="edit" WHERE id = 2',
            function (isSuccess) {
                test.strictEqual(isSuccess, null, 'callback param set to true');
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
    that.testQueryDelete = function (test) {
        test.expect(2);
        var that = this;
        that.sql.query(
            'DELETE FROM TableA WHERE id = 2',
            function (isSuccess) {
                test.strictEqual(isSuccess, null, 'callback param set to true');
                that.sql.query('SELECT * FROM TableA', function (err, rows) {
                    test.deepEqual(rows, [], 'row is deleted');
                    test.done();
                });
            }
        );
    };

    that.testOne = function (test) {
        test.expect(1);
        this.sql.one('SELECT col FROM TableA', function (err, rows) {
            test.deepEqual(rows, { col: 'default' });
            test.done();
        });
    };

    that.testSelect = function (test) {
        test.expect(1);
        this.sql.select('TableA', { id: 2 }, function (err, rows) {
            test.deepEqual(rows, [{ id: 2, col: "default"}]);
            test.done();
        });
    };

    that.testSelectOne = function (test) {
        test.expect(1);
        this.sql.selectOne('TableA', { id: 2 }, function (err, row) {
            test.deepEqual(row, { id: 2, col: "default"});
            test.done();
        });
    };

    //depends on testQuerySelect
    that.testInsert = function (test) {
        test.expect(2);
        var that = this;
        that.sql.insert('TableA', { id: 7, col: 'foo' }, function (err, insertId) {
            test.strictEqual(insertId, 7, 'passes callback insert id');
            that.sql.query('SELECT * FROM TableA WHERE id = 7', function (err, rows) {
                test.deepEqual(rows, [{ id: 7, col: 'foo' }], 'row is inserted');
                test.done();
            });
        });
    };

    //depends on testQuerySelect
    that.testUpdate = function (test) {
        test.expect(2);
        var that = this;
        that.sql.update('TableA', { col: 'edit' }, { id: 2 }, function (err) {
            test.strictEqual(err, null, 'error not set');
            that.sql.query('SELECT * FROM TableA WHERE id = 2', function (err, rows) {
                test.deepEqual(rows, [{ id: 2, col: 'edit' }], 'row is edited');
                test.done();
            });
        });
    };

    //depends on testQuerySelect
    that.testDelete = function (test) {
        test.expect(2);
        var that = this;
        that.sql.delete('TableA', { id: 2 }, function (err) {
            test.strictEqual(err, null, 'error not set');
            that.sql.query('SELECT * FROM TableA WHERE id = 2', function (err, rows) {
                test.deepEqual(rows, [], 'row is deleted');
                test.done();
            });
        });
    };

    return that;
};


exports.mysql = createTests({
    setUp: function () {
        mysqlConnection.query('DROP TABLE TableA');
        mysqlConnection.query(createMysqlDatabaseStatement);
        mysqlConnection.query(defaultRowStatement);
        return sql.createMySqlStrategy(mysqlConnection);
    }
});

exports.sqlite3 = createTests({
    setUp: function () {
        sqliteConnection = new sqlite.Database(':memory:');
        sqliteConnection.serialize(function () {
            sqliteConnection.run(createSqliteDatabaseStatement);
            sqliteConnection.run(defaultRowStatement);
        });
        return sql.createSqliteStrategy(sqliteConnection);
    }
});

//TODO
//very gross solution. mysql can only be disconnected once (and test runner wont
//exit untill connection is closed)
setTimeout(function () {
    mysqlConnection.end();
}, 6000);
