#NodeSQL
Adaptor that wraps node-mysql and node-sqlite3 databases with a common interface.  The intention is to allow fast unit testing of the database with sqlite's in memory database.

**NOTE** \* indicates an optional parameter

###Install

via npm

npm install nodesql

###Setup

```javascript
//using mysql
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'example.org',
  user     : 'bob',
  password : 'secret',
  database : 'databaseName',
  //only set the multipleStatements setting if you plan on using the transaction
  //method (and be careful) as it potentially exposes you to sql injection.
  multipleStatements: true
});

//or for sqlite3
var sqlite3 = require('sqlite3').verbose();
var connection = new sqlite3.Database(':memory:');

//wrap the database connection in a nodeSql adaptor.
var nodeSql = require('nodesql');
var db = nodeSql.createMySqlStrategy(connection);
//or
var db = nodeSql.createSqliteStrategy(connection);
```

###db.query(sqlStatement, \*values, \*callback)

**SELECT**
If no error occurs err will be null, and the second parameter will contain an array of rows.
```javascript
db.query('SELECT * FROM Table', function (err, rows) {
    if(!err) {
        console.log(rows);
    }
    else {
        console.log("An Error Occured");
        console.log(err);
    }
});
```

**INSERT**
The second parameter will be the id of the row that was just inserted.
```javascript
db.query('INSERT INTO Table (col) VALUES (?)', ['columnValue'], function (err, insertId) {
    if(!err) {
        console.log(insertId)
    }
})
```

**UPDATE**
```javascript
db.query('UPDATE ...', ..., function (err) {});
```

**DELETE**
```javascript
db.query('DELETE ...', ..., function (err) {});
```

###db.one(statement, *values, *callback)
returns the first result of a select statement.
```javascript
db.one('SELECT * FROM Table WHERE id = ?', [5], function (err, row) {
    //row is the first element of what would normally be
    //an array of rows.
});
```

###db.select(table, whereEqualsObject, *callback)
```javascript
//equivalent to db.query('SELECT * FROM Table WHERE id = ?', [5], function (err, rows) {});
db.select('Table', { id: 5 }, function (err, rows) {});
```

###db.selectOne(table, whereEqualsObject, *callback)
returns the first result of select
```javascript
db.selectOne('Table', { id: 5 }, function (err, row) {
    //row is the first element of what would normally be
    //an array of rows.
})
```

###db.insert(table, row, *callback)
```javascript
//equivalent to db.query('INSERT INTO Table (col) VALUES (?)', ['foo'], function (err, insertId) {});
db.insert('Table', { col: 'foo' }, function (err, insertId) {});
```

###db.update(table, rowEdits, whereEqualsObject, *callback)
```javascript
//equivalent to db.query('UPDATE Table SET col = ? WHERE id = ?', ['edit', 5], function (err) {});
db.update('Table', { col: 'edit' }, { id: 5 }, function (err) {});
```

###db.delete(table, whereEqualsObject, *callback)
```javascript
//equivalent to db.query('DELETE FROM Table WHERE id = ?', [5], function (err) {});
db.delete('Table', { id: 5 }, function (err) {});
```

###db.transaction(statements, *callback)
perform multiple sql statements that will be wrapped in a transaction.
```javascript
db.transaction(['INSERT INTO ...', 'INSERT INTO ...']);
```

##Promises

All NodeSQL that take callbacks also return Q promises.

```javascript
db.select('Table', {id: 5}).then(
    function (rows) {},
    function (err) {}
);
```
