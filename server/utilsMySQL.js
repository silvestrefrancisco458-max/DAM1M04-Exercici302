const mysql = require('mysql2/promise');

class MySQL {
  constructor() {
    this.pool = null;
  }

  init(config) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10
    });
  }

  async query(sql, params = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows;
  }

  table_to_json(rows) {
    return JSON.parse(JSON.stringify(rows));
  }

  async end() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = MySQL;