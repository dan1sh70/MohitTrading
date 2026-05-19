# Update List

## Indian Stock Buy Order Flow

- Added support for `LIMIT` and `MARKET` order types for Indian equity buy orders.
- For `LIMIT` buy orders:
  - the order is stored as a pending limit order
  - it appears in the portfolio `orders` section as pending
  - when the limit condition is met and the order auto-executes, it is moved into the user `positions`
- For `MARKET` buy orders:
  - the live market price is fetched and used immediately
  - the order executes instantly and is recorded as an active position

## Delivery vs Intraday

- Indian stock buy supports both `Intraday` and delivery-style equity trades.
- For `Intraday`:
  - selling first without an existing buy position is allowed
  - this supports short-style intraday execution
- For delivery equity:
  - selling first without an existing long holding is not allowed
  - delivery sell orders require an existing open `BUY` position for the same symbol

## Notes for Frontend

- Show pending limit orders in the portfolio `orders` list.
- When a pending limit order is filled, remove it from the pending orders list and display it in `positions`.
- Enforce `timeFrame` behavior:
  - `Intraday` allows first-sell flows
  - delivery equity disallows first-sell without holdings

## API Endpoints

- `POST /api/stocks/in/trade/buy`
  - Body: `{ symbol, quantity, entryPrice?, orderType, timeFrame, marginUsed, charges }`
  - `orderType` = `MARKET` or `LIMIT`
  - `timeFrame` = `Intraday`, `Tomorrow`, `1 Week`, `1 Month`, `Expiry`
  - `entryPrice` is optional for `MARKET` orders and required for `LIMIT` orders.
- `POST /api/stocks/in/trade/sell`
  - Body: `{ symbol, quantity, entryPrice?, orderType, timeFrame, marginUsed, charges }`
  - Delivery sell is blocked unless the user already holds the symbol in an active long position.
  - `Intraday` sells are allowed without an existing long position.
- `GET /api/stocks/in/trade/orders`
  - Returns pending Indian stock limit orders for the authenticated user.
- `POST /api/stocks/in/trade/orders/process`
  - Triggers processing of pending limit orders and fills those that meet market conditions.
- `GET /api/stocks/in/positions`
  - Returns active Indian stock positions for the authenticated user.
- `GET /api/stocks/in/positions/:positionId`
  - Returns details for a single position.
- `POST /api/stocks/in/positions/:positionId/exit`
  - Body: `{ exitPrice }`
  - Closes a position and updates balance.

## App Integration Guide

1. Authenticate first, then send requests with the user's token.
2. For buy flow:
   - Use `POST /stocks/in/trade/buy`.
   - Request body fields:
     - `symbol` (string)
     - `quantity` (integer)
     - `orderType` (`MARKET` or `LIMIT`)
     - `entryPrice` (optional for MARKET, required for LIMIT)
     - `timeFrame` (`Intraday`, `Tomorrow`, `1 Week`, `1 Month`, `Expiry`)
     - `marginUsed` and `charges`
   - If `orderType` is `LIMIT`, the backend creates a pending order.
   - If `orderType` is `MARKET`, the backend fetches live price and creates an active position immediately.
3. For sell flow:
   - Use `POST /stocks/in/trade/sell`.
   - For delivery mode, the frontend must only allow sell when the user has an existing active `BUY` position for that symbol.
   - For `Intraday`, selling first without a prior position is allowed.
4. To display pending orders:
   - Call `GET /stocks/in/trade/orders`.
   - Render pending `LIMIT` buy orders in the portfolio orders section with `status: PENDING`.
5. To show active positions:
   - Call `GET /stocks/in/positions`.
   - Render active positions in the positions tab.
6. To exit a position:
   - Call `POST /stocks/in/positions/:positionId/exit` with `{ exitPrice }`.
7. Processing pending limit orders:
   - The backend is responsible for executing pending limit orders when market conditions are met.
   - Frontend does not need to call `POST /stocks/in/trade/orders/process` during normal use, unless you want a manual refresh or admin action.
   - After a pending order fills, it should disappear from orders and appear in positions.

## Example Frontend Flow

- User selects stock and chooses `BUY`.
- Frontend sends `POST /stocks/in/trade/buy`.
  - If `LIMIT`, show confirmation and add order to pending list.
  - If `MARKET`, show the new active position.
- In portfolio:
  - `orders` tab shows pending `LIMIT` buys.
  - `positions` tab shows active positions after orders are filled.
- For delivery equity sells, hide or disable the sell button unless the user has an active long position for that symbol.
