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

app.get('/prices', async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const client = await pool.connect()
  try {
    const prices = await client.query(
      'select max(price_east) as price_east, max(price_west) as price_west, date(created_at) from prices group by date(created_at);'
    )
    res.send(prices.rows)
  } catch (err) {
    console.error({ stack: err.stack, msg: err.message })
    res.send([])
  } finally {
    client.release()
  }
})

app.get('/scrape', async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const client = await pool.connect()
  try {
    const lastFetch = await client.query(
      'select price_east, price_west, created_at from prices order by prices.created_at desc limit 1;'
    )
    const now = new Date()
    const tenHoursInMilliseconds = 1000 * 60 * 60 * 10
    const tenHoursAgo = now.setTime(now.getTime() - tenHoursInMilliseconds)
    // Only scrape if it has been at least 10 hours since last scrape, otherwise return latest results
    if (!(lastFetch.rows[0].created_at.getTime() < tenHoursAgo)) {
      return res.send({ eastPrice: lastFetch.rows[0].price_east, westPrice: lastFetch.rows[0].price_west })
    }

    const scraper = new Scraper()
    const prices = await scraper.scrape()

    await client.query('insert into prices (price_east, price_west) values ($1, $2)', [
      prices.eastPrice,
      prices.westPrice
    ])

    res.send(prices)
  } catch (err) {
    console.error({ stack: err.stack, msg: err.message })
    client.release()
    // Puppeteer likely encountered an error that cannot be resolved, restart the server
    server.close()
    process.exit(1)
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
