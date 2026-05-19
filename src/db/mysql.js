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
  let { mysqlQuery, mysqlParams } = convertPgPlaceholders(query, params);

  // Automatically parse and strip PostgreSQL 'RETURNING ...' syntax for MySQL compatibility
  const hasReturning = /RETURNING\s+(\w+)/i.test(mysqlQuery);
  const returningMatch = mysqlQuery.match(/RETURNING\s+(\w+)/i);
  const returningCol = returningMatch ? returningMatch[1] : 'id';
  mysqlQuery = mysqlQuery.replace(/\s+RETURNING\s+\w+/gi, "");

  const [result] = await pool.query(mysqlQuery, mysqlParams);

  if (Array.isArray(result)) {
    // Add pg compatibility properties to the array
    Object.defineProperties(result, {
      rows: {
        value: result,
        writable: true,
        configurable: true,
        enumerable: false // Keep it non-enumerable so it doesn't show up in loops/serialization
      },
      rowCount: {
        value: result.length,
        writable: true,
        configurable: true,
        enumerable: false
      },
      insertId: {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: false
      }
    });
    return result;
  }

  // For non-array results (OkPacket / ResultSetHeader)
  const rowsArray = [];
  if (result.insertId && hasReturning) {
    rowsArray.push({
      [returningCol]: result.insertId,
      id: result.insertId
    });
  }

  Object.defineProperties(rowsArray, {
    rows: {
      value: rowsArray,
      writable: true,
      configurable: true,
      enumerable: false
    },
    rowCount: {
      value: result.affectedRows ?? 0,
      writable: true,
      configurable: true,
      enumerable: false
    },
    insertId: {
      value: result.insertId ?? undefined,
      writable: true,
      configurable: true,
      enumerable: false
    }
  });
  return rowsArray;
}
