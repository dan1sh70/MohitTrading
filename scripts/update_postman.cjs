const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../postman/PaperTrading-API.postman_collection.json');

try {
  const collectionData = fs.readFileSync(collectionPath, 'utf8');
  const collection = JSON.parse(collectionData);

  // Helper to create an item
  const createItem = (name, method, urlPath, auth = true, body = null) => {
    const item = {
      name: name,
      request: {
        method: method,
        header: [],
        url: {
          raw: `{{base_url}}/${urlPath}`,
          host: ["{{base_url}}"],
          path: urlPath.split('/')
        }
      },
      response: []
    };

    if (auth) {
      item.request.auth = {
        type: "bearer",
        bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
      };
    }

    if (body) {
      item.request.body = {
        mode: "raw",
        raw: JSON.stringify(body, null, 2),
        options: { raw: { language: "json" } }
      };
    }

    return item;
  };

  // 1. Add Crypto Analytics
  const cryptoFolder = collection.item.find(i => i.name === 'Crypto Trading');
  if (cryptoFolder) {
    let analyticsFolder = cryptoFolder.item.find(i => i.name === 'Analytics');
    if (!analyticsFolder) {
      analyticsFolder = { name: "Analytics", item: [] };
      cryptoFolder.item.push(analyticsFolder);
    }
    
    const existingEndpoints = analyticsFolder.item.map(i => i.name);
    
    if (!existingEndpoints.includes("Get Portfolio Health")) {
      analyticsFolder.item.push(createItem("Get Portfolio Health", "GET", "api/crypto/portfolio-health"));
    }
    if (!existingEndpoints.includes("Get Risk Meter")) {
      analyticsFolder.item.push(createItem("Get Risk Meter", "GET", "api/crypto/risk-meter"));
    }
    if (!existingEndpoints.includes("Get Report Card")) {
      analyticsFolder.item.push(createItem("Get Report Card", "GET", "api/crypto/report-card"));
    }
  }

  // 2. Add New Global Markets
  const addMarketFolder = (marketName, basePath) => {
    let folder = collection.item.find(i => i.name === marketName);
    if (!folder) {
      folder = { name: marketName, item: [] };
      collection.item.push(folder);
    }
    
    const existingEndpoints = folder.item.map(i => i.name);
    
    if (!existingEndpoints.includes(`Buy ${marketName}`)) {
      folder.item.push(createItem(`Buy ${marketName}`, "POST", `api/${basePath}/trade/buy`, true, {
        symbol: "AAPL",
        quantity: 10,
        entryPrice: 150.50,
        timeFrame: "INTRADAY"
      }));
    }
    if (!existingEndpoints.includes(`Sell ${marketName}`)) {
      folder.item.push(createItem(`Sell ${marketName}`, "POST", `api/${basePath}/trade/sell`, true, {
        symbol: "AAPL",
        quantity: 10,
        entryPrice: 155.00,
        timeFrame: "INTRADAY"
      }));
    }
    if (!existingEndpoints.includes(`Get ${marketName} Performance`)) {
      folder.item.push(createItem(`Get ${marketName} Performance`, "GET", `api/${basePath}/performance`));
    }
  };

  addMarketFolder("US Stocks", "stocks/us");
  addMarketFolder("Forex", "forex");
  addMarketFolder("Commodities", "commodities");

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
  console.log('Successfully updated Postman collection!');

} catch (err) {
  console.error('Error updating Postman collection:', err);
}
