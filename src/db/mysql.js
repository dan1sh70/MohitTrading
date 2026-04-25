import mysql from "mysql2/promise";
import { env } from "../config/env.js";

function getDatabaseConfig() {
  if (env.databaseUrl) {
    const url = new URL(env.databaseUrl);

    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username || "root"),
      password: decodeURIComponent(url.password || ""),
      database: url.pathname.replace(/^\//, "") || "paper_trading"
    };
  }

  return {
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName
  };
}

export const pool = mysql.createPool({
  ...getDatabaseConfig(),
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  multipleStatements: true
});

function convertPgPlaceholders(query, params) {
  if (!params.length || !query.includes("$")) {
    return { mysqlQuery: query, mysqlParams: params };
  }

  const mysqlParams = [];
  const mysqlQuery = query.replace(/\$(\d+)/g, (_match, index) => {
    const position = Number(index) - 1;
    mysqlParams.push(params[position]);
    return "?";
  });

  return { mysqlQuery, mysqlParams };
}

export async function sql(query, params = []) {
  const { mysqlQuery, mysqlParams } = convertPgPlaceholders(query, params);
  const [result] = await pool.query(mysqlQuery, mysqlParams);

  if (Array.isArray(result)) {
    return {
      rows: result,
      rowCount: result.length,
      insertId: undefined
    };
  }

  return {
    rows: [],
    rowCount: result.affectedRows ?? 0,
    insertId: result.insertId ?? undefined
  };
}
