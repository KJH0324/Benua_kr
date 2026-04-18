import Database from 'better-sqlite3';
const db1 = new Database('benua.db');
const users1 = db1.prepare("SELECT email FROM users").all();
console.log('benua.db users:', users1);

const db2 = new Database('database.db');
const users2 = db2.prepare("SELECT email FROM users").all();
console.log('database.db users:', users2);
