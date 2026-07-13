require('dotenv').config()

const http = require('http')
const url = require('url')
const db = require('./database')
const PORT = process.env.PORT


// helper function json
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    })

    res.end(JSON.stringify(data))
}

//  helper function parse body
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', (chunk) => {
            body += chunk.toString()
        })

        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {}
                resolve(parsed)
            } catch (error) {
                reject(error)
            }
        })

        req.on('error', reject)
    })
}

// Function menampilkan data

// Function menampilkan seluruh data obat
async function getObat(req, res) {
    try {
        const [rows] = await db.query(`
            SELECT id, nama_obat, kategori, harga, stock,
            DATE_FORMAT(tanggal_kadaluarsa, '%Y-%m-%d') AS tanggal_kadaluarsa
            FROM obat
            ORDER BY created_at ASC
            `)

        sendJSON(res, 200, {
            status: 'success',
            total: rows.length,
            data: rows
        })

    } catch (error) {
        console.error('Error get obat:', error)
        sendJSON(res, 500, { status: 'error', message: 'Gagal mengambil data obat' })
    }
}

// Function menampilkan data obat berdasarkan id
async function getObatById(req, res, id) {
    try {
        const [rows] = await db.query(`SELECT * FROM obat WHERE id= ?`, [id])

        if (rows.length === 0) {
            return sendJSON(res, 404, { status: 'error', message: 'Obat tidak ditemukan' })
        }
        sendJSON(res, 200, {
            status: 'success',
            data: rows[0]
        })
    } catch (error) {
        console.error('Error get obat by id:', error)
        sendJSON(res, 500, { status: 'error', message: 'Gagal mengambil data obat' })
    }
}

// Membuat server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true)
    const pathname = parsedUrl.pathname
    const method = req.method

    // endpoint menampilkan seluruh data obat
    if (method === 'GET' && pathname === '/api/obat') {
        await getObat(req, res)
    }

    // endpoint menampilkan data obat berdasarkan id
    if (method === 'GET' && pathname.match(/^\/api\/obat\/\d+$/)) {
        const id = parseInt(pathname.split('/')[3]) // split id karena id berada di index 3 setelah /api/obat/
        await getObatById(req, res, id)
    }
})

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})