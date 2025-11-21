import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

console.log('🔍 Testing TiDB connection...');
console.log('Connection string:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

try {
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('✅ Connected to TiDB successfully!');
  
  const [rows] = await connection.execute('SELECT VERSION() as version, DATABASE() as db');
  console.log('📊 Database info:', rows[0]);
  
  await connection.end();
  console.log('✅ Connection test completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}
