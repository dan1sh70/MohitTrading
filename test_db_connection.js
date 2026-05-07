// Test database connection for production server
import { env } from './src/config/env.js';
import mysql from 'mysql2/promise';

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log('Database config:', {
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    database: env.dbName,
    hasDatabaseUrl: !!env.databaseUrl
  });

  try {
    let connection;
    
    if (env.databaseUrl) {
      console.log('Using DATABASE_URL connection');
      connection = await mysql.createConnection(env.databaseUrl);
    } else {
      console.log('Using individual DB parameters connection');
      connection = await mysql.createConnection({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName
      });
    }

    // Test basic query
    const [rows] = await connection.execute('SELECT COUNT(*) as userCount FROM users');
    console.log('✅ Database connection successful!');
    console.log('User count:', rows[0].userCount);

    // Test indian_stock_positions table
    try {
      const [positions] = await connection.execute('SELECT COUNT(*) as positionCount FROM indian_stock_positions');
      console.log('Indian stock positions count:', positions[0].positionCount);
    } catch (err) {
      console.log('❌ indian_stock_positions table error:', err.message);
    }

    await connection.end();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
  }
}

testDatabaseConnection();
