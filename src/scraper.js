const puppeteer = require('puppeteer')
const { sleep } = require('./utils/sleep')

const EAST_REGION = 'VestØstØst'
const WEST_REGION = 'VestØstVest'

class Scraper {
  constructor() {
    this.endpoint = 'https://orsted.dk/Privat/Priser/Skift-til-orsted/Koeb-el'
    this.browserConfig = {
      headless: false,
      devtools: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // For running on debian in docker
    }
  }
  async scrape() {
    this.browser = await puppeteer.launch(this.browserConfig)
    this.page = await this.browser.newPage()

    this.page.goto(this.endpoint)

    const westPrices = await this.getPriceForRegion(WEST_REGION)
    const eastPrices = await this.getPriceForRegion(EAST_REGION)

    console.log(eastPrices, westPrices)
    return {
      eastFixedPrice: eastPrices.fixedPrice,
      westFixedPrice: westPrices.fixedPrice,
      eastVariablePrice: eastPrices.variablePrice,
      westVariablePrice: westPrices.variablePrice
    }
  }

  async getPriceForRegion(region) {
    const sliderContainer = await this.page.waitForXPath('//*[@id="o-geo-slide-containter"]')

    // Sometimes the slider knot is a little slow at appearing, so wait a while
    await sleep(5000)
    const sliderLeft = await this.page.$('.o-geo-knot.left')

    // When sliderLeft exists we are at WEST_REGION
    if (region === WEST_REGION && sliderLeft) {
      return this.getPriceWithRetry()
    } else if (region === EAST_REGION && !sliderLeft) {
      return this.getPriceWithRetry()
    } else {
      await sliderContainer.click()
      await sleep(1000)
      return this.getPriceWithRetry()
    }
  }

  // The price is not loaded at the same time as the page but once it's loaded both values are there
  async getPriceWithRetry() {
    const priceRegex = /\d+,\d+/

    const fixedPriceDivParent = await this.page.$('[data-id="F12"]')
    const fixedPriceText = await this.page.evaluate(element => element.innerText, fixedPriceDivParent)
    const fixedDanishDecimalPriceMatch = fixedPriceText.match(priceRegex)

    if (!fixedDanishDecimalPriceMatch) {
      await sleep(100)
      return this.getPriceWithRetry()
    }
    const fixedPrice = Number(fixedDanishDecimalPriceMatch[0].replace(',', '.'))

    const variablePriceSpanDivParent = await this.page.$('[data-id="V"]')
    const variablePriceText = await this.page.evaluate(element => element.innerText, variablePriceSpanDivParent)
    const variableDanishDecimalPriceMatch = variablePriceText.match(priceRegex)
    const variablePrice = Number(variableDanishDecimalPriceMatch[0].replace(',', '.'))

    return { fixedPrice, variablePrice }
  }
}

module.exports = Scraper
