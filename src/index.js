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
      'select max(price_east) as eastFixedPrice, max(price_east_variable) as eastVariablePrice, max(price_west) as westFixedPrice, max(price_west_variable) as westVariablePrice, date(created_at) from prices group by date(created_at) order by date(created_at);'
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
      'select price_east, price_west, price_east_variable, price_west_variable, created_at from prices order by prices.created_at desc limit 1;'
    )
    const now = new Date()
    const tenHoursInMilliseconds = 1000 * 60 * 60 * 10
    const tenHoursAgo = now.setTime(now.getTime() - tenHoursInMilliseconds)
    // Only scrape if it has been at least 10 hours since last scrape, otherwise return latest results
    const latestResult = lastFetch.rows[0]
    if (!(latestResult.created_at.getTime() < tenHoursAgo)) {
      return res.send({
        eastFixedPrice: latestResult.price_east,
        westFixedPrice: latestResult.price_west,
        eastVariablePrice: latestResult.price_east_variable,
        westVariablePrice: latestResult.price_west_variable
      })
    }

    const scraper = new Scraper()
    const prices = await scraper.scrape()

    await client.query(
      'insert into prices (price_east, price_west, price_east_variable, price_west_variable) values ($1, $2, $3, $4)',
      [prices.eastFixedPrice, prices.westFixedPrice, prices.eastVariablePrice, prices.westVariablePrice]
    )

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
