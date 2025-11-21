import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

console.log('🔍 Adding Kie.ai API Key to database...');

try {
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('✅ Connected to database');
  
  // Check if API key already exists
  const [existing] = await connection.execute(
    'SELECT * FROM apiKeys WHERE id = ?',
    ['kie-api-key-1']
  );
  
  if (existing.length > 0) {
    console.log('⚠️  API Key already exists, updating...');
    await connection.execute(
      `UPDATE apiKeys 
       SET name = ?, apiKey = ?, isActive = ?, monthlyBudget = ?, currentSpend = ?, lastResetAt = NOW() 
       WHERE id = ?`,
      [
        'Kie.ai Primary API Key',
        'e7895ec500b4dfa6710dba20391b0414',
        1,
        0,
        0,
        'kie-api-key-1'
      ]
    );
    console.log('✅ API Key updated successfully');
  } else {
    console.log('➕ Inserting new API Key...');
    await connection.execute(
      `INSERT INTO apiKeys (id, name, apiKey, isActive, monthlyBudget, currentSpend, lastResetAt, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'kie-api-key-1',
        'Kie.ai Primary API Key',
        'e7895ec500b4dfa6710dba20391b0414',
        1,
        0,
        0
      ]
    );
    console.log('✅ API Key inserted successfully');
  }
  
  // Verify the insertion
  const [result] = await connection.execute(
    'SELECT id, name, isActive, monthlyBudget, currentSpend FROM apiKeys WHERE id = ?',
    ['kie-api-key-1']
  );
  
  console.log('\n📊 API Key Details:');
  console.log(result[0]);
  
  await connection.end();
  console.log('\n✅ Done!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
