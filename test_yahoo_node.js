
const YahooFinance = require('yahoo-finance2').default;

async function test() {
  const yahooFinance = new YahooFinance();
  const symbol = 'ADVANC.BK';
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 15);

  try {
    console.log(`Fetching data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}...`);
    
    // Test fundamentalsTimeSeries
    const result = await yahooFinance.fundamentalsTimeSeries(symbol, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
      type: 'annual',
      module: 'all'
    });

    console.log(JSON.stringify(result[0], null, 2)); // Print first record to see structure
    console.log("\nDates available:");
    result.forEach(r => console.log(r.date));

  } catch (error) {
    console.error('Error:', error);
  }
}

test();
