const express = require('express')
const cors = require('cors')
const PORT = process.env.PORT || 5000
const { Pool } = require('pg')
const Scraper = require('./scraper')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
})

const app = express()
app.use(
  cors({
    origin: ['https://mathiastj.github.io', 'http://localhost:3000'],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
)

// app.get('/prices', async (req, res) => {
//   res.setHeader('Content-Type', 'application/json')
//   const client = await pool.connect()
//   try {
//     const results = []

//     res.send(results)
//   } catch (err) {
//     console.error({ stack: err.stack, msg: err.message })
//     res.send([])
//   } finally {
//     client.release()
//   }
// })

app.get('/scrape', async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const client = await pool.connect()
  try {
    const scraper = new Scraper()
    const prices = await scraper.scrape()

    await client.query('insert into prices (price_east, price_west) values ($1, $2)', [
      prices.eastPrice,
      prices.westPrice
    ])

    res.send(prices)
  } catch (err) {
    console.error({ stack: err.stack, msg: err.message })
    res.send([])
  } finally {
    client.release()
  }
})

const server = app.listen(PORT, () => {
  console.log(`listening on ${PORT}`)
})

process.on('uncaughtException', err => {
  console.warn(err)
  server.close()
  process.exit(1)
})
process.on('unhandledRejection', reason => {
  console.warn(reason)
  server.close()
  process.exit(1)
})
