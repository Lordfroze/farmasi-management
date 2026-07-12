// hanya untuk test koneksi
const db = require('./database')

async function testConnection() {
    try {
        console.log('Connected to database')
    } catch (error) {
        console.error('Error connecting to database:', error.message)
    } finally {
        await db.end()
        process.exit()
    }
}

testConnection()
