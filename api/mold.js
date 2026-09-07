const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 22600,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await connection.query(`
      CREATE TABLE IF NOT EXISTS mold_projects (
        id VARCHAR(100) PRIMARY KEY,
        mold_name VARCHAR(255),
        job_desc VARCHAR(255),
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        checkpoints JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    if (req.method === 'GET') {
      const [rows] = await connection.query("SELECT * FROM mold_projects WHERE id = 'active-mold' LIMIT 1");
      await connection.end();
      return res.status(200).json(rows[0] || null);
    }

    if (req.method === 'POST') {
      const { moldName, moldJob, moldStartDate, moldEndDate, checkpoints } = req.body;
      const sql = `
        INSERT INTO mold_projects (id, mold_name, job_desc, start_date, end_date, checkpoints)
        VALUES ('active-mold', ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          mold_name = VALUES(mold_name),
          job_desc = VALUES(job_desc),
          start_date = VALUES(start_date),
          end_date = VALUES(end_date),
          checkpoints = VALUES(checkpoints)
      `;
      await connection.query(sql, [
        moldName || '',
        moldJob || '',
        moldStartDate || '',
        moldEndDate || '',
        JSON.stringify(checkpoints || [])
      ]);
      await connection.end();
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    if (connection) await connection.end();
    return res.status(500).json({ error: err.message });
  }
};
