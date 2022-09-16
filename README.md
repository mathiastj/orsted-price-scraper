# Ørsted Price Scraper

## Deprecated due to major change in Ørsted pricings and website redesign.

Scrape the electricity prices on https://orsted.dk/Privat/Priser/Skift-til-orsted/Koeb-el daily to make more informed decisions on when to change between variable and static electricity subscriptions.

See the daily prices since 27th March 2019 here: https://lit-tundra-27294.herokuapp.com/prices (Hosted freely on Heroku).
Above no longer works due to Heroku phasing out their free tier.

Free Heroku dynos are automatically put to sleep after 30 minutes without activity. The scrape endpoint `/scrape` is pinged twice a day to wake the dyno and scrape the prices. The prices are only scraped if the last scrape was more than 12 hours ago.
