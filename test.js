var sql = require('./nodesql'),

    _ = require('underscore'),
    configuration = require('./configuration.json'),

    sqlite = require('sqlite3').verbose(),
    sqliteConnection,

    mysql = require('mysql'),

    mysqlConnection = mysql.createConnection({
        host: configuration.database.host,
        user: configuration.database.user,
        password: configuration.database.password,
        database: configuration.database.name
    }),

    createMysqlDatabaseStatement = '' +
    'CREATE TABLE TableA (' +
        'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ' +
        'col VARCHAR(64) NOT NULL UNIQUE' +
    ')',

    createSqliteDatabaseStatement = '' +
    'CREATE TABLE TableA (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'col VARCHAR(64) NOT NULL UNIQUE' +
    ')',

    defaultRowStatement = 'INSERT INTO TableA (id, col) VALUES (2, "default")',

    isMySQLConnection;


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

    that.testQueryPromisesSelect = function (test) {
        test.expect(1);
        this.sql.query('SELECT * FROM TableA').then(function (rows) {
            test.deepEqual(rows, [{ id: 2, col: "default"}]);
            test.done();
        });
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
    that.testQueryPromisesInsert = function (test) {
        test.expect(2);
        var that = this;
        that.sql.query('INSERT INTO TableA (id, col) VALUES (?, ?)', [5, 'foo'])
        .then(function (insertId) {
            test.strictEqual(insertId, 5, 'returns insert id');
            that.sql.query('SELECT * FROM TableA WHERE id = 5', function (err, rows) {
                test.deepEqual(
                    rows, [{ id: 5, col: 'foo' }], 'row is inserted'
                );
                test.done();
            });
        });
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
    that.testQueryPromisesUpdate = function (test) {
        test.expect(1);
        var that = this;
        that.sql.query('UPDATE TableA SET col="edit" WHERE id = 2').then(function () {
            that.sql.query('SELECT * FROM TableA', function (err, rows) {
                test.deepEqual(rows, [{ id: 2, col: 'edit' }], 'row is updated');
                test.done();
            });
        });
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

    //depends on testQuerySelect
    that.testQueryPromisesDelete = function (test) {
        test.expect(1);
        var that = this;
        that.sql.query('DELETE FROM TableA WHERE id = 2').then(function () {
            that.sql.query('SELECT * FROM TableA', function (err, rows) {
                test.deepEqual(rows, [], 'row is deleted');
                test.done();
            });
        });
    };

    that.testOne = function (test) {
        test.expect(1);
        this.sql.one('SELECT col FROM TableA', function (err, rows) {
            test.deepEqual(rows, { col: 'default' });
            test.done();
        });
    };

    that.testPromisesOne = function (test) {
        test.expect(1);
        this.sql.one('SELECT col FROM TableA').then(function (row) {
            test.deepEqual(row, { col: 'default' });
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

    that.testPromisesSelect = function (test) {
        test.expect(1);
        this.sql.select('TableA', { id: 2 }).then(function (rows) {
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

    that.testPromisesSelectOne = function (test) {
        test.expect(1);
        this.sql.selectOne('TableA', { id: 2 }).then(function (row) {
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
    that.testPromisesInsert = function (test) {
        test.expect(2);
        var that = this;
        that.sql.insert('TableA', { id: 7, col: 'foo' }).then(function (insertId) {
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
    that.testPromisesUpdate = function (test) {
        test.expect(1);
        var that = this;
        that.sql.update('TableA', { col: 'edit' }, { id: 2 }).then(function () {
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

    //depends on testQuerySelect
    that.testPromisesDelete = function (test) {
        test.expect(1);
        var that = this;
        that.sql.delete('TableA', { id: 2 }).then(function () {
            that.sql.query('SELECT * FROM TableA WHERE id = 2', function (err, rows) {
                test.deepEqual(rows, [], 'row is deleted');
                test.done();
            });
        });
    };

    that.testInsertError = function (test) {
        test.expect(2);
        this.sql.query(
            'INSERT INTO wrong (id, col) VALUES (?, ?)',
            [7, 'foo'],
            function (err, id) {
                test.ok(err, 'err parameter is set');
                test.strictEqual(id, undefined, 'id parameter is not set');
                test.done();
            }
        );
    };

    that.testInsertPromisesError = function (test) {
        test.expect(1);
        this.sql.query('INSERT INTO wrong (id, col) VALUES (?, ?)', [7, 'foo'])
        .then(null, function (err) {
            test.ok(err, 'err parameter is set');
            test.done();
        });
    };

    that.testSelectError = function (test) {
        test.expect(2);
        this.sql.query('SELECT * FROM wrong', function (err, rows) {
            test.ok(err, 'err parameter is set');
            test.strictEqual(rows, undefined, 'rows paramter is not set');
            test.done();
        });
    };

    that.testSelectPromisesError = function (test) {
        test.expect(1);
        this.sql.query('SELECT * FROM wrong').then(null, function (err) {
            test.ok(err, 'err parameter is set');
            test.done();
        });
    };

    that.testUpdateError = function (test) {
        test.expect(1);
        this.sql.query('UPDATE wrong SET col = "edit"', function (err) {
            test.ok(err, 'err parameter is set');
            test.done();
        });
    };

    that.testUpdatePromisesError = function (test) {
        test.expect(1);
        this.sql.query('UPDATE wrong SET col = "edit"').then(null, function (err) {
            test.ok(err, 'err parameter is set');
            test.done();
        });
    };

    that.testDeleteError = function (test) {
        test.expect(1);
        this.sql.query('DELETE FROM wrong WHERE id = 2', function (err) {
            test.ok(err, 'err parameter is set');
            test.done();
        });
    };

     that.testDeletePromisesError = function (test) {
        test.expect(1);
        this.sql.query('DELETE FROM wrong WHERE id = 2').then(null, function (err) {
            test.ok(err, 'err parameter is set');
            test.done();
        });
    };

    that.testOneError = function (test) {
        test.expect(2);
        this.sql.one('SELECT * FROM wrong', function (err, row) {
            test.ok(err, 'err parameter is set');
            test.strictEqual(row, undefined, 'row parameter is not set');
            test.done();
        });
    };

    that.testOnePromisesError = function (test) {
        test.expect(1);
        this.sql.one('SELECT * FROM wrong').then(null, function (err) {
            test.ok(err, 'err parameter is set');
            test.done();
        });
    };

    that.testOneNoResults = function (test) {
        test.expect(2);
        this.sql.one('SELECT * FROM TableA WHERE id = 1234', function (err, row) {
            test.strictEqual(err, null, 'err is set to null');
            test.strictEqual(row, null, 'row is set to null');
            test.done();
        });
    };

    that.testSelectOneError = function (test) {
        test.expect(2);
        this.sql.selectOne('wrong', { id: 5 }, function (err, row) {
            test.ok(err, 'err parameter is set');
            test.strictEqual(row, undefined, 'row is set not set');
            test.done();
        });
    };

    that.testSelectOnePromisesError = function (test) {
        test.expect(1);
        this.sql.selectOne('wrong', { id: 5 }).then(null, function (err) {
            test.ok(err, 'err parameter is set');
            test.done();
        });
    };

    that.testSelectOneNoResults = function (test) {
        test.expect(2);
        this.sql.selectOne('TableA', { id: 1234 }, function (err, row) {
            test.strictEqual(err, null, 'err is set to null');
            test.strictEqual(row, null, 'row is set to null');
            test.done();
        });
    };

    that.testSqlInjection = function (test) {
        test.expect(1);
        var that = this;
        that.sql.query(
            'SELECT * FROM TableA WHERE id = ?',
            ["2'; DELETE FROM TableA WHERE id = 2"],
            function (err, rows) {
                that.sql.query('SELECT * FROM TableA', function (err, rows) {
                    test.deepEqual(rows, [{ id: 2, col: 'default' }]);
                    test.done();
                });
            }
        );
    };

    that.queryErrorUniqueFieldConstraint = function (test) {
        test.expect(2);
        var that = this;
        that.sql.query('INSERT INTO TableA (col) VALUES ("default")', function (err) {
            test.deepEqual(err, {
                code: 'UNIQUE',
                indexName: 'col',
                message: 'Duplicate entry for col allready exists'
            }, 'correct error is set');
            that.sql.selectOne('TableA', { id: 15 }, function (err, row) {
                test.strictEqual(row, null, 'row not inserted');
                test.done();
            });
        });
    };

    that.testGroupCleanUp = function (test) {
        if(isMySQLConnection) {
            mysqlConnection.end();
        }
        test.ok(true);
        test.done();
    };

    return that;
};


exports.sqlite3 = createTests({
    setUp: function () {
        isMySQLConnection = false;
        sqliteConnection = new sqlite.Database(':memory:');
        sqliteConnection.serialize(function () {
            sqliteConnection.run(createSqliteDatabaseStatement);
            sqliteConnection.run(defaultRowStatement);
        });
        return sql.createSqliteStrategy(sqliteConnection);
    }
});

exports.mysql = createTests({
    setUp: function () {
        isMySQLConnection = true;
        mysqlConnection.query('DROP TABLE TableA');
        mysqlConnection.query(createMysqlDatabaseStatement);
        mysqlConnection.query(defaultRowStatement);
        return sql.createMySqlStrategy(mysqlConnection, mysql);
    }
});
