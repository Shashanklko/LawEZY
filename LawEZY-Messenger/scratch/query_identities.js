const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

async function query() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const [prof] = await connection.execute("SELECT * FROM professional_profiles WHERE uid = 'AP34SHLW'");
        console.log('PROFESSIONAL:', JSON.stringify(prof, null, 2));

        const [client] = await connection.execute("SELECT * FROM client_profiles WHERE uid = '11SS01CL'");
        console.log('CLIENT:', JSON.stringify(client, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

query();
