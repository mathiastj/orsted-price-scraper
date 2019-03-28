const puppeteer = require('puppeteer')
const { sleep } = require('./utils/sleep')

const EAST_REGION = 'VestØstØst'
const WEST_REGION = 'VestØstVest'

class Scraper {
  constructor() {
    this.endpoint = 'https://orsted.dk/Privat/Priser/Skift-til-orsted/Koeb-el'
    this.browserConfig = {
      headless: true,
      devtools: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // For running on debian in docker
    }
  }
  async scrape() {
    this.browser = await puppeteer.launch(this.browserConfig)
    this.page = await this.browser.newPage()

    this.page.goto(this.endpoint)

    const eastPrice = await this.getPriceForRegion(EAST_REGION)
    const westPrice = await this.getPriceForRegion(WEST_REGION)

    console.log(eastPrice, westPrice)
    return {
      eastPrice,
      westPrice
    }
  }

  async getPriceForRegion(region) {
    const sliderContainer = await this.page.waitForXPath('//*[@id="o-geo-slide-fast-containter"]')
    // console.log(sliderContainer)
    const text = await this.page.evaluate(element => element.textContent, sliderContainer)
    const noSpacedText = text.replace(/\s*/g, '')

    if (noSpacedText === region) {
      return this.getPriceWithRetry()
    } else {
      await sliderContainer.click()
      await sleep(250)
      return this.getPriceWithRetry()
    }
  }

  // The price is not loaded at the same time as the page but once it's loaded both values are there
  async getPriceWithRetry() {
    const priceSpan = await this.page.waitForXPath('//*[@id="o-price-value-fixed"]')
    const danishDecimalPrice = await this.page.evaluate(element => element.textContent, priceSpan)
    const price = Number(danishDecimalPrice.replace(',', '.'))

    if (isNaN(price)) {
      await sleep(100)
      return this.getPriceWithRetry()
    } else {
      return price
    }
  }
}

module.exports = Scraper
