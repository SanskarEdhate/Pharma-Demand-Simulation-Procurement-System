// Seeded pseudorandom number generator (mulberry32)
// For 100% reproducible results given the same input
class SeededRNG {
  constructor(seed) {
    this.seed = seed;
  }

  // Returns a value between 0.0 and 1.0
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns a uniform float between min and max
  uniform(min, max) {
    return min + this.next() * (max - min);
  }

  // Returns an integer between min (inclusive) and max (exclusive)
  // Matching Python's rng.integers(low, high)
  integer(min, max) {
    return Math.floor(min + this.next() * (max - min));
  }
}

// Fixed simulation date
export const SIMULATION_DATE = new Date(Date.UTC(2021, 0, 1));
export const EXPIRY_THRESHOLD_DAYS = 120;
export const REQUIRED_COLUMNS = ["Product Name", "Quantity", "Month", "Year"];

export const COLUMN_ALIASES = {
  "Product Name": ["product name", "product_name", "product", "item", "item name", "item_name", "drug", "medicine", "formulation", "sku", "name", "brand", "medicine name"],
  "Quantity": ["quantity", "qty", "quantity sold", "units", "units sold", "volume", "sales", "count", "amount", "sold"],
  "Month": ["month", "month name", "sales month", "mo", "period", "mnth"],
  "Year": ["year", "sales year", "yr"]
};

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const MONTH_ABBR = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec"
];

// Helper to format dates as YYYY-MM-DD
export function formatDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Validates whether the CSV headers contain all required columns or recognized aliases.
 * @param {Array<string>} headers 
 * @returns {boolean}
 */
export function validateHeaders(headers) {
  if (!Array.isArray(headers)) {
    console.error("Headers is not an array:", headers);
    return false;
  }
  
  const cleanHeaders = headers
    .filter(h => h != null)
    .map(h => (typeof h === 'string' ? h.trim().toLowerCase() : String(h || '').trim().toLowerCase()));
  
  const missing = REQUIRED_COLUMNS.filter(col => {
    const aliases = COLUMN_ALIASES[col] || [col.toLowerCase()];
    return !cleanHeaders.some(h => aliases.includes(h));
  });

  if (missing.length > 0) {
    console.warn("Validation failed - missing required headers:", missing, "available headers:", cleanHeaders);
    return false;
  }
  return true;
}

/**
 * Parses and processes raw CSV row data.
 * @param {Array<Object>} rawData 
 * @returns {Array<Object>} simulation results
 */
export function runSimulation(rawData, customSimulationDateStr = "2021-01-01") {
  console.log("runSimulation started with", rawData.length, "rows");
  console.log("First 5 rows of input data:", rawData.slice(0, 5));
  
  // Performance protection: limit dataset size
  const MAX_ROWS = 10000;
  if (rawData.length > MAX_ROWS) {
    console.warn(`Dataset too large (${rawData.length} rows). Limiting to ${MAX_ROWS}.`);
    rawData = rawData.slice(0, MAX_ROWS);
  }

  // Initialize seeded RNG (seed = 42 to match the python source code)
  const rng = new SeededRNG(42);

  // Parse custom simulation date safely
  const dateParts = customSimulationDateStr.split("-").map(n => parseInt(n, 10));
  const simDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2] || 1));

  // Normalize column names and clean data
  const cleanedData = [];
  let processedRows = 0;
  const MAX_PROCESSED_ROWS = 50000; // Safety limit for processing

  rawData.forEach(row => {
    processedRows++;
    if (processedRows > MAX_PROCESSED_ROWS) {
      console.warn("Maximum processed rows limit reached");
      return false; // Stop processing
    }
    
    // Skip null/undefined rows
    if (!row || typeof row !== 'object') {
      console.warn("Skipping invalid row:", row);
      return;
    }
    
    // Find keys matching required columns or aliases (case-insensitive)
    let prodName = "";
    let quantityVal = NaN;
    let monthStr = "";
    let yearVal = NaN;

    Object.keys(row).forEach(key => {
      const k = key.trim().toLowerCase();
      const val = row[key];
      if (val === undefined || val === null || val === "") return;

      if (!prodName && COLUMN_ALIASES["Product Name"].includes(k)) {
        prodName = String(val).trim();
      } else if (isNaN(quantityVal) && COLUMN_ALIASES["Quantity"].includes(k)) {
        quantityVal = parseFloat(String(val).replace(/,/g, ""));
      } else if (!monthStr && COLUMN_ALIASES["Month"].includes(k)) {
        monthStr = String(val).trim();
      } else if (isNaN(yearVal) && COLUMN_ALIASES["Year"].includes(k)) {
        yearVal = parseInt(val, 10);
      }
    });

    if (!prodName || isNaN(quantityVal) || !monthStr || isNaN(yearVal)) {
      console.warn(`Skipping row with missing data: prodName="${prodName}", quantity=${quantityVal}, month="${monthStr}", year=${yearVal}`);
      return; // Skip rows that cannot be parsed
    }

    if (quantityVal < 0) {
      return; // Skip negative quantities
    }

    // Date parsing - support full name, abbreviation, or numeric month (1-12)
    const cleanMonth = monthStr.toLowerCase();
    let monthIdx = MONTH_NAMES.indexOf(cleanMonth);
    if (monthIdx === -1) {
      monthIdx = MONTH_ABBR.indexOf(cleanMonth.slice(0, 3));
    }
    if (monthIdx === -1 && !isNaN(parseInt(cleanMonth, 10))) {
      const numMonth = parseInt(cleanMonth, 10);
      if (numMonth >= 1 && numMonth <= 12) {
        monthIdx = numMonth - 1;
      }
    }
    if (monthIdx === -1) {
      console.warn(`Invalid month string: "${monthStr}" (cleaned: "${cleanMonth}")`);
      return; // Skip invalid month strings
    }

    // Represent date as UTC Date object representing 1st of that month
    const dateObj = new Date(Date.UTC(yearVal, monthIdx, 1));
    if (isNaN(dateObj.getTime())) {
      return; // Skip invalid dates
    }

    cleanedData.push({
      product: prodName,
      quantity: quantityVal,
      dateStr: formatDate(dateObj),
      dateObj: dateObj
    });
  });

  console.log("Cleaned data:", cleanedData.length, "rows");
  if (cleanedData.length === 0) {
    console.error("No cleaned data - all rows were filtered out");
    return [];
  }

  // Group by Product Name and Date
  // Structure: { [product]: { [dateStr]: sumOfQuantity } }
  const productSales = {};
  cleanedData.forEach(item => {
    if (!productSales[item.product]) {
      productSales[item.product] = {};
    }
    if (!productSales[item.product][item.dateStr]) {
      productSales[item.product][item.dateStr] = 0;
    }
    productSales[item.product][item.dateStr] += item.quantity;
  });

  // Unique products in order of appearance
  const uniqueProducts = [];
  cleanedData.forEach(item => {
    if (!uniqueProducts.includes(item.product)) {
      uniqueProducts.push(item.product);
    }
  });

  console.log("Unique products:", uniqueProducts.length);
  if (uniqueProducts.length === 0) {
    console.error("No unique products found");
    return [];
  }

  const records = [];
  let processedProducts = 0;
  const MAX_PRODUCTS = 1000; // Safety limit for products

  uniqueProducts.forEach(product => {
    processedProducts++;
    if (processedProducts > MAX_PRODUCTS) {
      console.warn("Maximum products limit reached");
      return false; // Stop processing
    }
    
    const datesGroup = productSales[product];
    console.log(`Processing product ${product}, dates:`, Object.keys(datesGroup));
    
    // Sort chronological dates
    const sortedDates = Object.keys(datesGroup).sort((a, b) => new Date(a) - new Date(b));
    const salesValues = sortedDates.map(dStr => datesGroup[dStr]);
    console.log(`Sales values for ${product}:`, salesValues);

    // Calculate Average Monthly Sales
    const totalSalesSum = salesValues.reduce((sum, val) => sum + val, 0);
    const avgMonthlySales = salesValues.length > 0 ? totalSalesSum / salesValues.length : 0.0;

    // Demand Forecasting
    let predictedDemand = 0.0;
    if (salesValues.length >= 3) {
      const lastThree = salesValues.slice(-3);
      predictedDemand = lastThree[0] * 0.2 + lastThree[1] * 0.3 + lastThree[2] * 0.5;
    } else if (salesValues.length > 0) {
      predictedDemand = avgMonthlySales;
    } else {
      predictedDemand = 0.0;
    }
    predictedDemand = Math.max(predictedDemand, 0.0);

    // Warehouse simulation (deterministic drawing matching order of products)
    const lastDataDateStr = sortedDates[sortedDates.length - 1];
    const lastDataDate = new Date(lastDataDateStr);

    const riskyPct = rng.uniform(0.10, 0.50);
    const riskyStockAmt = avgMonthlySales * riskyPct;
    const riskyExpiryDays = rng.integer(30, 151); // 30 to 150 inclusive
    const riskyExpiryDate = new Date(lastDataDate.getTime() + riskyExpiryDays * 24 * 60 * 60 * 1000);

    const freshPct = rng.uniform(0.50, 2.50);
    const freshStockAmt = avgMonthlySales * freshPct;
    const freshExpiryDays = rng.integer(300, 701); // 300 to 700 inclusive
    const freshExpiryDate = new Date(lastDataDate.getTime() + freshExpiryDays * 24 * 60 * 60 * 1000);

    const leadTime = rng.integer(5, 15); // 5 to 14 inclusive

    // Draw cost and price using seeded RNG to preserve deterministic drawing order
    const purchaseCost = rng.uniform(5.00, 100.00);
    const sellingPrice = rng.uniform(purchaseCost * 1.2, purchaseCost * 2.5);

    // Compute Profitability Metrics
    const annualUnitsSold = predictedDemand * 12;
    const revenue = annualUnitsSold * sellingPrice;
    const profit = annualUnitsSold * (sellingPrice - purchaseCost);
    const profitMargin = sellingPrice > 0 ? ((sellingPrice - purchaseCost) / sellingPrice) * 100 : 0.0;

    // Compute EOQ Metrics
    const annualDemand = annualUnitsSold; // Annual Demand = Predicted Demand * 12
    const orderingCost = 50;
    const holdingCost = Math.max(purchaseCost * 0.20, 1);
    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
    const ordersPerYear = eoq > 0 ? annualDemand / eoq : 0;
    const daysBetweenOrders = ordersPerYear > 0 ? 365 / ordersPerYear : 0;
    const annualCostSavings = eoq * 0.10;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const riskyDaysToExpiry = (riskyExpiryDate.getTime() - simDate.getTime()) / MS_PER_DAY;
    const freshDaysToExpiry = (freshExpiryDate.getTime() - simDate.getTime()) / MS_PER_DAY;

    let usableStock = 0.0;
    let riskyStockTotal = 0.0;
    let expiredStockTotal = 0.0;

    if (riskyDaysToExpiry < 0) {
      expiredStockTotal += riskyStockAmt;
    } else if (riskyDaysToExpiry <= EXPIRY_THRESHOLD_DAYS) {
      riskyStockTotal += riskyStockAmt;
    } else {
      usableStock += riskyStockAmt;
    }

    if (freshDaysToExpiry < 0) {
      expiredStockTotal += freshStockAmt;
    } else if (freshDaysToExpiry <= EXPIRY_THRESHOLD_DAYS) {
      riskyStockTotal += freshStockAmt;
    } else {
      usableStock += freshStockAmt;
    }

    const totalStock = usableStock + riskyStockTotal + expiredStockTotal;
    const safetyStock = 0.20 * predictedDemand;
    const reorderPoint = (predictedDemand / 30.0 * leadTime) + safetyStock;

    let action = "🟢 OPTIMAL";
    let unitsToBuy = 0.0;

    if (usableStock < reorderPoint) {
      action = "🚨 RESTOCK";
      unitsToBuy = Math.max((predictedDemand + safetyStock) - usableStock, 0.0);
    } else if (usableStock > (predictedDemand * 2.5)) {
      action = "📦 EXCESSIVE";
      unitsToBuy = 0.0;
    }

    const nearestExpiryDate = riskyExpiryDate < freshExpiryDate ? riskyExpiryDate : freshExpiryDate;
    const nearestExpiryIsPast = nearestExpiryDate.getTime() < simDate.getTime();

    records.push({
      "Product Name": product,
      "Avg Monthly Sales": Math.round(avgMonthlySales * 100) / 100,
      "Predicted Demand (Next Month)": Math.round(predictedDemand * 100) / 100,
      "Lead Time (Days)": leadTime,
      "Usable Stock": Math.round(usableStock * 100) / 100,
      "Risky Stock (Near Expiry)": Math.round(riskyStockTotal * 100) / 100,
      "Expired Stock": Math.round(expiredStockTotal * 100) / 100,
      "Total Stock": Math.round(totalStock * 100) / 100,
      "Safety Stock": Math.round(safetyStock * 100) / 100,
      "Reorder Point (ROP)": Math.round(reorderPoint * 100) / 100,
      "Nearest Expiry Date": formatDate(nearestExpiryDate),
      "Nearest Expiry Is Past": nearestExpiryIsPast,
      "Action": action,
      "Units to Buy": Math.round(unitsToBuy),
      "Purchase Cost": Math.round(purchaseCost * 100) / 100,
      "Selling Price": Math.round(sellingPrice * 100) / 100,
      "Profit Margin (%)": Math.round(profitMargin * 10) / 10,
      "Annual Demand": Math.round(annualDemand),
      "EOQ": Math.round(eoq),
      "Days Between Orders": Math.round(daysBetweenOrders),
      "Annual Cost Savings": Math.round(annualCostSavings * 100) / 100,
      "Revenue": Math.round(revenue * 100) / 100,
      "Profit": Math.round(profit * 100) / 100,
    });
  });

  console.log("Simulation complete, returning", records.length, "records");
  if (records.length > 0) {
    console.log("Sample record:", records[0]);
  }
  return records;
}

// Sample Pharmaceutical historical sales data (Amoxicillin, Lipitor, Metformin, etc.)
export const SAMPLE_DATA = [
  // Amoxicillin
  { "Product Name": "Amoxicillin 500mg", "Quantity": 1200, "Month": "September", "Year": 2020 },
  { "Product Name": "Amoxicillin 500mg", "Quantity": 1350, "Month": "October", "Year": 2020 },
  { "Product Name": "Amoxicillin 500mg", "Quantity": 1400, "Month": "November", "Year": 2020 },
  { "Product Name": "Amoxicillin 500mg", "Quantity": 1550, "Month": "December", "Year": 2020 },

  // Lipitor
  { "Product Name": "Lipitor 20mg", "Quantity": 800, "Month": "September", "Year": 2020 },
  { "Product Name": "Lipitor 20mg", "Quantity": 750, "Month": "October", "Year": 2020 },
  { "Product Name": "Lipitor 20mg", "Quantity": 900, "Month": "November", "Year": 2020 },
  { "Product Name": "Lipitor 20mg", "Quantity": 850, "Month": "December", "Year": 2020 },

  // Metformin
  { "Product Name": "Metformin 1000mg", "Quantity": 2000, "Month": "September", "Year": 2020 },
  { "Product Name": "Metformin 1000mg", "Quantity": 2100, "Month": "October", "Year": 2020 },
  { "Product Name": "Metformin 1000mg", "Quantity": 1950, "Month": "November", "Year": 2020 },
  { "Product Name": "Metformin 1000mg", "Quantity": 2200, "Month": "December", "Year": 2020 },

  // Metoprolol
  { "Product Name": "Metoprolol Succinate 50mg", "Quantity": 950, "Month": "September", "Year": 2020 },
  { "Product Name": "Metoprolol Succinate 50mg", "Quantity": 980, "Month": "October", "Year": 2020 },
  { "Product Name": "Metoprolol Succinate 50mg", "Quantity": 1020, "Month": "November", "Year": 2020 },
  { "Product Name": "Metoprolol Succinate 50mg", "Quantity": 1050, "Month": "December", "Year": 2020 },

  // Gabapentin
  { "Product Name": "Gabapentin 300mg", "Quantity": 1500, "Month": "September", "Year": 2020 },
  { "Product Name": "Gabapentin 300mg", "Quantity": 1450, "Month": "October", "Year": 2020 },
  { "Product Name": "Gabapentin 300mg", "Quantity": 1600, "Month": "November", "Year": 2020 },
  { "Product Name": "Gabapentin 300mg", "Quantity": 1550, "Month": "December", "Year": 2020 },

  // Synthroid
  { "Product Name": "Synthroid 100mcg", "Quantity": 1800, "Month": "September", "Year": 2020 },
  { "Product Name": "Synthroid 100mcg", "Quantity": 1850, "Month": "October", "Year": 2020 },
  { "Product Name": "Synthroid 100mcg", "Quantity": 1750, "Month": "November", "Year": 2020 },
  { "Product Name": "Synthroid 100mcg", "Quantity": 1900, "Month": "December", "Year": 2020 },

  // Ventolin HFA
  { "Product Name": "Ventolin HFA Albuterol", "Quantity": 500, "Month": "September", "Year": 2020 },
  { "Product Name": "Ventolin HFA Albuterol", "Quantity": 520, "Month": "October", "Year": 2020 },
  { "Product Name": "Ventolin HFA Albuterol", "Quantity": 480, "Month": "November", "Year": 2020 },
  { "Product Name": "Ventolin HFA Albuterol", "Quantity": 540, "Month": "December", "Year": 2020 },

  // Losartan
  { "Product Name": "Losartan 50mg", "Quantity": 700, "Month": "September", "Year": 2020 },
  { "Product Name": "Losartan 50mg", "Quantity": 710, "Month": "October", "Year": 2020 },
  { "Product Name": "Losartan 50mg", "Quantity": 730, "Month": "November", "Year": 2020 },
  { "Product Name": "Losartan 50mg", "Quantity": 720, "Month": "December", "Year": 2020 }
];
