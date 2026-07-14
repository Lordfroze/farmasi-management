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

// Function menambahkan obat
async function createObat(req, res) {
    try {
        const body = await parseBody(req)

        const { nama_obat, kategori, harga, stock, tanggal_kadaluarsa } = body
        if (!nama_obat || !kategori || !harga || !stock || !tanggal_kadaluarsa) {
            return sendJSON(res, 400, {
                status: 'error',
                message: 'Harap isi semua field'
            })
        }

        // validasi kolom kategori berdasarkan enum di database
        const allowedKategori = ['antibiotik', 'analgesik', 'vitamin']
        if (!allowedKategori.includes(kategori)) {
            return sendJSON(res, 400, {
                status: 'error',
                message: 'Kategori tidak valid'
            })
        }

        // insert data ke database
        const [result] = await db.query(
            `
            INSERT INTO obat (nama_obat, kategori, harga, stock, tanggal_kadaluarsa)
            VALUES (?, ?, ?, ?, ?)
            `,
            [nama_obat, kategori, harga, stock || 0, tanggal_kadaluarsa]
        )

        sendJSON(res, 201, {
            status: 'success',
            message: 'Obat berhasil ditambahkan',
            id: result.insertId // mengambil id yang diinsert
        })

    } catch (error) {
        console.error('Error create obat:', error)
        sendJSON(res, 500, {
            status: 'error',
            message: 'Gagal menambahkan obat'
        })
    }
}

// function update obat
async function updateObat(req, res, id) {
    try {
        const body = await parseBody(req) // mengambil body dari request
        const { nama_obat, kategori, harga, stock, tanggal_kadaluarsa } = body // mengambil field dari body
        const updates = []  // menyimpan update ke dalam array updates
        const values = [] // menyimpan nilai dari field yang diupdate

        if (nama_obat !== undefined) { // jika field nama_obat ada
            updates.push('nama_obat = ?') // menambahkan nama_obat ke dalam updates
            values.push(nama_obat) // push nilai nama_obat ke dalam values
        }
        if (kategori !== undefined) {
            updates.push('kategori = ?')
            values.push(kategori)
        }
        if (harga !== undefined) {
            updates.push('harga = ?')
            values.push(harga)
        }
        if (stock !== undefined) {
            updates.push('stock = ?')
            values.push(stock || 0)
        }
        if (tanggal_kadaluarsa !== undefined) {
            updates.push('tanggal_kadaluarsa = ?')
            values.push(tanggal_kadaluarsa)
        }
        // jika tidak ada field yang diupdate, maka return error
        if (updates.length === 0) {
            return sendJSON(res, 400, {
                status: 'error',
                message: 'Tidak ada field yang diupdate'
            })
        }

        values.push(id) // push value diatas berdasarkan id

        // update data ke database
        const [result] = await db.query(
            `UPDATE obat SET ${updates.join(', ')} WHERE id = ?`,
            values
        )

        // jika tidak ada obat yang diupdate, maka return error
        if (result.affectedRows === 0) {
            return sendJSON(res, 404, {
                status: 'error',
                message: 'Obat tidak ditemukan'
            })
        }

        sendJSON(res, 200, {
            status: 'success',
            message: 'Obat berhasil diupdate'
        })
    } catch (error) {
        console.error('Error update obat:', error)
        sendJSON(res, 500, {
            status: 'error',
            message: 'Gagal mengupdate obat'
        })
    }
}

// Function menghapus obat
async function deleteObat(req, res, id) {
    try {
        const [check] = await db.query(`SELECT id FROM obat WHERE id = ?`, [id])
        if (check.length === 0) {
            return sendJSON(res, 404, {
                status: 'error',
                message: 'Obat tidak ditemukan'
            })
        }

        await db.query(`DELETE FROM obat WHERE id = ?`, [id])
        sendJSON(res, 200, {
            status: 'success',
            message: 'Obat berhasil dihapus'
        })
    } catch (error) {
        console.error('Error delete obat:', error)
        sendJSON(res, 500, {
            status: 'error',
            message: 'Gagal menghapus obat'
        })
    }

}

// function jual obat
async function jualObat(req, res) {
    try {
        const body = await parseBody(req) // mengambil body dari request
        const { obat_id, jumlah } = body

        if (!obat_id || !jumlah || jumlah < 0) {
            return sendJSON(res, 400, {
                status: 'error',
                message: 'field obat_id dan jumlah harus diisi'
            })
        }

        const connection = await db.getConnection()
        await connection.beginTransaction()

        try {
            // mengambil data obat 
            const [obat] = await connection.query(
                `SELECT id, nama_obat, harga, stock FROM obat WHERE id = ? FOR UPDATE`,
                [obat_id])

            // jika tidak ada obat yang diupdate, maka return error
            if (obat.length === 0) {
                throw new Error('Obat tidak ditemukan')
            }

            // menyimpan data obat ke dalam variabel dataObat
            const dataObat = obat[0]

            // jika stock obat kurang dari jumlah jual, maka return error
            if (dataObat.stock < jumlah) {
                throw new Error(`stock tidak cukup, terisa : ${dataObat.stock}`)
            }

            // mengupdate stock obat
            const stockBaru = dataObat.stock - jumlah

            await connection.query(
                `UPDATE obat SET stock = ? WHERE id = ?`, [stockBaru, obat_id]
            )

            // mengupdate TABEL transaksi
            const totalHarga = dataObat.harga * jumlah

            await connection.query(
                `INSERT INTO transaksi (obat_id, jumlah_terjual, total_harga) VALUES (?, ?, ?)`,
                [obat_id, jumlah, totalHarga]
            )

            // commit transaction jika semua query berhasil
            await connection.commit()

            sendJSON(res, 200, {
                status: 'success',
                message: 'Penjualan berhasil',
                detail: {
                    obat: dataObat.nama_obat,
                    jumlah: jumlah,
                    total_harga: totalHarga,
                    stock_sisa: stockBaru
                }
            })
        } catch (error) {
            // jika ada error, maka rollback transaction
            await connection.rollback()
            throw error
        } finally {
            // selalu kembali ke pool connection
            await connection.release()
        }
    } catch (error) {
        console.error('Error jual obat:', error)
        sendJSON(res, 500, {
            status: 'error',
            message: error.message || 'Gagal jual obat'
        })
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
    else if (method === 'GET' && pathname.match(/^\/api\/obat\/\d+$/)) {
        const id = parseInt(pathname.split('/')[3]) // split id karena id berada di index 3 setelah /api/obat/
        await getObatById(req, res, id)
    }

    // endpoint menambahkan obat
    else if (method === 'POST' && pathname === '/api/obat') {
        await createObat(req, res)
    }

    // endpoint untuk update obat
    else if (method === 'PUT' && pathname.match(/^\/api\/obat\/\d+$/)) {
        const id = parseInt(pathname.split('/')[3]) // split id karena id berada di index 3 setelah /api/obat/
        await updateObat(req, res, id)
    }

    // endpoint untuk menghapus obat
    else if (method === 'DELETE' && pathname.match(/^\/api\/obat\/\d+$/)) {
        const id = parseInt(pathname.split('/')[3]) // split id karena id berada di index 3 setelah /api/obat/
        await deleteObat(req, res, id)
    }

    // endpoint untuk jual obat
    else if (method === 'POST' && pathname === '/api/transaksi/jual') {
        await jualObat(req, res)
    }
})

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})