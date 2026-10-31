const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: "postgresql://sridattam_admin:sridattam_secure_pass_2026@localhost:5432/sridattam_dev_db?schema=public"
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL successfully.");

    const userRes = await client.query('SELECT id, email, role, first_name, last_name, is_active FROM users');
    console.log(`Found ${userRes.rowCount} users:`);
    console.table(userRes.rows);

    const productRes = await client.query('SELECT count(*) FROM products');
    console.log(`Total products in DB: ${productRes.rows[0].count}`);

    const categoryRes = await client.query('SELECT count(*) FROM categories');
    console.log(`Total categories in DB: ${categoryRes.rows[0].count}`);

    const orderRes = await client.query('SELECT count(*) FROM orders');
    console.log(`Total orders in DB: ${orderRes.rows[0].count}`);

    const paymentRes = await client.query('SELECT count(*) FROM payments');
    console.log(`Total payments in DB: ${paymentRes.rows[0].count}`);

    await client.end();
  } catch (err) {
    console.error("DB check error:", err);
  }
}

check();
