const fs = require('fs');
const path = require('path');

const collectionPath = path.join(process.cwd(), 'postman', 'PaperTrading-API.postman_collection.json');
let collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Find the Crypto Trading folder (if it exists)
let cryptoFolder = collection.item.find(i => i.name === 'Crypto Trading' || i.name === 'Crypto');

if (cryptoFolder) {
  // Check if history already exists
  const exists = cryptoFolder.item.find(i => i.name === 'Get Crypto History' || i.request?.url?.raw?.includes('/history'));
  
  if (!exists) {
    cryptoFolder.item.push({
      "name": "Get Crypto History",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/crypto/history?limit=100",
          "host": [
            "{{base_url}}"
          ],
          "path": [
            "api",
            "crypto",
            "history"
          ],
          "query": [
            {
              "key": "limit",
              "value": "100"
            }
          ]
        }
      },
      "response": []
    });
    fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    console.log("Added Get Crypto History to Postman collection.");
  } else {
    console.log("History endpoint already in Postman collection.");
  }
} else {
  console.log("Could not find Crypto folder in collection.");
}
