var sql = require('./sql'),

    sqlite = require('sqlite3').verbose(),
    sqliteConnection,

    mysqlConnection = require('mysql').createConnection({
        host: 'localhost',
        user: 'root',
        password: 'P0l.ar-B3ar',
        database: 'test'
    }),

    createDatabaseQuery = function () {
        return '' +
        'CREATE TABLE IF NOT EXISTS `TableA` (' +
            '`id` INT NOT NULL, ' +
            '`colA` VARCHAR(64) NULL, ' +
            '`colB` VARCHAR(64) NULL, ' +
            'PRIMARY KEY (`id`), ' +
            'UNIQUE INDEX `colB_UNIQUE` (`colB` ASC)' +
        ')';
    };


exports.sql = {
    setUp: function (finished) {
        mysqlConnection.connect();
        sqliteConnection = new sqlite.Database(':memory:');

        mysqlConnection.query(createDatabaseQuery());
        sqliteConnection.run(createDatabaseQuery());

        this.mysql = sql.createMySqlStrategy(mysqlConnection);
        this.sqlite = sql.createSqliteStrategy(sqliteConnection);

        finished();
    },

    tearDown: function (finished) {
        mysqlConnection.query('DROP TABLE TableA');
        mysqlConnection.end();
        finished();
    },

    testFoo: function (test) {
        test.expect(1);
        test.ok(true);
        test.done();
    }
};