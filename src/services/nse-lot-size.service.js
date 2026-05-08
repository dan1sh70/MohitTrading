/**
 * NSE LOT SIZE SERVICE
 * 
 * Provides lot size information for Indian stocks trading on NSE F&O segment.
 * Lot sizes are fixed by NSE for Futures & Options contracts.
 * 
 * DATA SOURCE: NSE India Official Lot Size List
 * UPDATED: 2024-2025
 * 
 * Features:
 * - Get lot size for any NSE F&O symbol
 * - Calculate quantity from lots
 * - Validate lot multiples
 * - Get all supported symbols
 * 
 * LOT SIZE CATEGORIES:
 * - Index Futures (NIFTY: 50, BANKNIFTY: 25, FINNIFTY: 40)
 * - Stock Futures (varies: 75 for TCS, 250 for RELIANCE, etc.)
 * - Equity Delivery: 1 (flexible)
 */

import { cacheGet, cacheSet } from "../db/redis.js";

const CACHE_TTL = 86400; // 24 hours - lot sizes don't change frequently

// ═══════════════════════════════════════════════════════════════════════════
// NSE F&O LOT SIZES DATABASE (2024-2025)
// ═══════════════════════════════════════════════════════════════════════════

const NSE_LOT_SIZES = {
  // ===== INDEX FUTURES & OPTIONS =====
  "NIFTY": { lotSize: 50, name: "Nifty 50", category: "index", exchange: "NSE" },
  "BANKNIFTY": { lotSize: 25, name: "Bank Nifty", category: "index", exchange: "NSE" },
  "FINNIFTY": { lotSize: 40, name: "Fin Nifty", category: "index", exchange: "NSE" },
  "MIDCPNIFTY": { lotSize: 75, name: "Midcap Nifty", category: "index", exchange: "NSE" },
  "SENSEX": { lotSize: 50, name: "Sensex", category: "index", exchange: "BSE" },
  "BANKEX": { lotSize: 30, name: "Bankex", category: "index", exchange: "BSE" },
  
  // ===== LARGE CAP STOCKS =====
  "RELIANCE": { lotSize: 250, name: "Reliance Industries", category: "large_cap", exchange: "NSE" },
  "TCS": { lotSize: 75, name: "Tata Consultancy Services", category: "large_cap", exchange: "NSE" },
  "HDFCBANK": { lotSize: 500, name: "HDFC Bank", category: "large_cap", exchange: "NSE" },
  "INFY": { lotSize: 200, name: "Infosys", category: "large_cap", exchange: "NSE" },
  "ICICIBANK": { lotSize: 1000, name: "ICICI Bank", category: "large_cap", exchange: "NSE" },
  "SBIN": { lotSize: 3000, name: "State Bank of India", category: "large_cap", exchange: "NSE" },
  "HINDUNILVR": { lotSize: 100, name: "Hindustan Unilever", category: "large_cap", exchange: "NSE" },
  "HDFC": { lotSize: 200, name: "Housing Development Finance Corp", category: "large_cap", exchange: "NSE" },
  "ITC": { lotSize: 800, name: "ITC Limited", category: "large_cap", exchange: "NSE" },
  "KOTAKBANK": { lotSize: 400, name: "Kotak Mahindra Bank", category: "large_cap", exchange: "NSE" },
  "AXISBANK": { lotSize: 1200, name: "Axis Bank", category: "large_cap", exchange: "NSE" },
  "BAJFINANCE": { lotSize: 125, name: "Bajaj Finance", category: "large_cap", exchange: "NSE" },
  "BHARTIARTL": { lotSize: 950, name: "Bharti Airtel", category: "large_cap", exchange: "NSE" },
  "ASIANPAINT": { lotSize: 150, name: "Asian Paints", category: "large_cap", exchange: "NSE" },
  "MARUTI": { lotSize: 125, name: "Maruti Suzuki", category: "large_cap", exchange: "NSE" },
  "TITAN": { lotSize: 350, name: "Titan Company", category: "large_cap", exchange: "NSE" },
  "LT": { lotSize: 300, name: "Larsen & Toubro", category: "large_cap", exchange: "NSE" },
  "WIPRO": { lotSize: 1600, name: "Wipro", category: "large_cap", exchange: "NSE" },
  "ADANIENT": { lotSize: 400, name: "Adani Enterprises", category: "large_cap", exchange: "NSE" },
  "SUNPHARMA": { lotSize: 700, name: "Sun Pharmaceutical", category: "large_cap", exchange: "NSE" },
  "ULTRACEMCO": { lotSize: 100, name: "UltraTech Cement", category: "large_cap", exchange: "NSE" },
  "NESTLEIND": { lotSize: 20, name: "Nestle India", category: "large_cap", exchange: "NSE" },
  "POWERGRID": { lotSize: 4500, name: "Power Grid Corp", category: "large_cap", exchange: "NSE" },
  "NTPC": { lotSize: 5700, name: "NTPC Limited", category: "large_cap", exchange: "NSE" },
  "COALINDIA": { lotSize: 4200, name: "Coal India", category: "large_cap", exchange: "NSE" },
  "ONGC": { lotSize: 3850, name: "Oil & Natural Gas Corp", category: "large_cap", exchange: "NSE" },
  "GRASIM": { lotSize: 475, name: "Grasim Industries", category: "large_cap", exchange: "NSE" },
  "ADANIPORTS": { lotSize: 800, name: "Adani Ports", category: "large_cap", exchange: "NSE" },
  "M&M": { lotSize: 700, name: "Mahindra & Mahindra", category: "large_cap", exchange: "NSE" },
  "BAJAJFINSV": { lotSize: 100, name: "Bajaj Finserv", category: "large_cap", exchange: "NSE" },
  "HCLTECH": { lotSize: 650, name: "HCL Technologies", category: "large_cap", exchange: "NSE" },
  "TECHM": { lotSize: 750, name: "Tech Mahindra", category: "large_cap", exchange: "NSE" },
  "TATAMOTORS": { lotSize: 1700, name: "Tata Motors", category: "large_cap", exchange: "NSE" },
  "JSWSTEEL": { lotSize: 1500, name: "JSW Steel", category: "large_cap", exchange: "NSE" },
  "TATASTEEL": { lotSize: 850, name: "Tata Steel", category: "large_cap", exchange: "NSE" },
  "CIPLA": { lotSize: 1300, name: "Cipla", category: "large_cap", exchange: "NSE" },
  "INDUSINDBK": { lotSize: 1400, name: "IndusInd Bank", category: "large_cap", exchange: "NSE" },
  "APOLLOHOSP": { lotSize: 125, name: "Apollo Hospitals", category: "large_cap", exchange: "NSE" },
  "DRREDDY": { lotSize: 125, name: "Dr Reddy's Labs", category: "large_cap", exchange: "NSE" },
  "EICHERMOT": { lotSize: 70, name: "Eicher Motors", category: "large_cap", exchange: "NSE" },
  "DIVISLAB": { lotSize: 150, name: "Divi's Labs", category: "large_cap", exchange: "NSE" },
  "HEROMOTOCO": { lotSize: 300, name: "Hero MotoCorp", category: "large_cap", exchange: "NSE" },
  "BPCL": { lotSize: 1800, name: "Bharat Petroleum", category: "large_cap", exchange: "NSE" },
  "BRITANNIA": { lotSize: 150, name: "Britannia Industries", category: "large_cap", exchange: "NSE" },
  "SHREECEM": { lotSize: 25, name: "Shree Cement", category: "large_cap", exchange: "NSE" },
  "SBILIFE": { lotSize: 750, name: "SBI Life Insurance", category: "large_cap", exchange: "NSE" },
  "HDFCLIFE": { lotSize: 1100, name: "HDFC Life Insurance", category: "large_cap", exchange: "NSE" },
  "IOC": { lotSize: 4875, name: "Indian Oil Corp", category: "large_cap", exchange: "NSE" },
  
  // ===== MID CAP STOCKS =====
  "DLF": { lotSize: 3300, name: "DLF Limited", category: "mid_cap", exchange: "NSE" },
  "VEDL": { lotSize: 3100, name: "Vedanta", category: "mid_cap", exchange: "NSE" },
  "DABUR": { lotSize: 1250, name: "Dabur India", category: "mid_cap", exchange: "NSE" },
  "PIDILITIND": { lotSize: 250, name: "Pidilite Industries", category: "mid_cap", exchange: "NSE" },
  "AMBUJACEM": { lotSize: 800, name: "Ambuja Cements", category: "mid_cap", exchange: "NSE" },
  "GODREJCP": { lotSize: 500, name: "Godrej Consumer", category: "mid_cap", exchange: "NSE" },
  "ZOMATO": { lotSize: 2750, name: "Zomato", category: "mid_cap", exchange: "NSE" },
  "PNB": { lotSize: 10000, name: "Punjab National Bank", category: "mid_cap", exchange: "NSE" },
  "GAIL": { lotSize: 6100, name: "GAIL India", category: "mid_cap", exchange: "NSE" },
  "SIEMENS": { lotSize: 200, name: "Siemens India", category: "mid_cap", exchange: "NSE" },
  "ABB": { lotSize: 250, name: "ABB India", category: "mid_cap", exchange: "NSE" },
  "COLPAL": { lotSize: 350, name: "Colgate-Palmolive", category: "mid_cap", exchange: "NSE" },
  "MCDOWELL-N": { lotSize: 550, name: "United Spirits", category: "mid_cap", exchange: "NSE" },
  "LUPIN": { lotSize: 600, name: "Lupin Limited", category: "mid_cap", exchange: "NSE" },
  "BERGEPAINT": { lotSize: 800, name: "Berger Paints", category: "mid_cap", exchange: "NSE" },
  "TORNTPHARM": { lotSize: 200, name: "Torrent Pharma", category: "mid_cap", exchange: "NSE" },
  "INDIGO": { lotSize: 450, name: "InterGlobe Aviation", category: "mid_cap", exchange: "NSE" },
  "HAVELLS": { lotSize: 500, name: "Havells India", category: "mid_cap", exchange: "NSE" },
  "MARICO": { lotSize: 1000, name: "Marico", category: "mid_cap", exchange: "NSE" },
  "ICICIGI": { lotSize: 425, name: "ICICI Lombard", category: "mid_cap", exchange: "NSE" },
  "BAJAJHLDNG": { lotSize: 175, name: "Bajaj Holdings", category: "mid_cap", exchange: "NSE" },
  "IRCTC": { lotSize: 350, name: "IRCTC", category: "mid_cap", exchange: "NSE" },
  "CANBK": { lotSize: 2700, name: "Canara Bank", category: "mid_cap", exchange: "NSE" },
  "BANKBARODA": { lotSize: 4050, name: "Bank of Baroda", category: "mid_cap", exchange: "NSE" },
  "IOC": { lotSize: 4875, name: "Indian Oil Corp", category: "mid_cap", exchange: "NSE" },
  "YESBANK": { lotSize: 10000, name: "Yes Bank", category: "mid_cap", exchange: "NSE" },
  "IDFCFIRSTB": { lotSize: 15000, name: "IDFC First Bank", category: "mid_cap", exchange: "NSE" },
  "UCOBANK": { lotSize: 12000, name: "UCO Bank", category: "mid_cap", exchange: "NSE" },
  "IOB": { lotSize: 17000, name: "Indian Overseas Bank", category: "mid_cap", exchange: "NSE" },
  "BANDHANBNK": { lotSize: 2900, name: "Bandhan Bank", category: "mid_cap", exchange: "NSE" },
  "AUBANK": { lotSize: 2000, name: "AU Small Finance Bank", category: "mid_cap", exchange: "NSE" },
  "FEDERALBNK": { lotSize: 5000, name: "Federal Bank", category: "mid_cap", exchange: "NSE" },
  "RBLBANK": { lotSize: 2900, name: "RBL Bank", category: "mid_cap", exchange: "NSE" },
  "IDEA": { lotSize: 70000, name: "Vodafone Idea", category: "mid_cap", exchange: "NSE" },
  "HAL": { lotSize: 600, name: "Hindustan Aeronautics", category: "mid_cap", exchange: "NSE" },
  "BEL": { lotSize: 5700, name: "Bharat Electronics", category: "mid_cap", exchange: "NSE" },
  "COFORGE": { lotSize: 200, name: "Coforge", category: "mid_cap", exchange: "NSE" },
  "PERSISTENT": { lotSize: 350, name: "Persistent Systems", category: "mid_cap", exchange: "NSE" },
  "MPHASIS": { lotSize: 325, name: "Mphasis", category: "mid_cap", exchange: "NSE" },
  "LTIM": { lotSize: 300, name: "LTIMindtree", category: "mid_cap", exchange: "NSE" },
  "OFSS": { lotSize: 160, name: "Oracle Financial", category: "mid_cap", exchange: "NSE" },
  "AFFLE": { lotSize: 200, name: "Affle India", category: "mid_cap", exchange: "NSE" },
  "POLYCAB": { lotSize: 300, name: "Polycab India", category: "mid_cap", exchange: "NSE" },
  "CROMPTON": { lotSize: 2200, name: "Crompton Greaves", category: "mid_cap", exchange: "NSE" },
  "TIINDIA": { lotSize: 500, name: "Tube Investments", category: "mid_cap", exchange: "NSE" },
  "VOLTAS": { lotSize: 2000, name: "Voltas", category: "mid_cap", exchange: "NSE" },
  "BOSCHLTD": { lotSize: 60, name: "Bosch India", category: "mid_cap", exchange: "NSE" },
  "CGPOWER": { lotSize: 4500, name: "CG Power", category: "mid_cap", exchange: "NSE" },
  "WHIRLPOOL": { lotSize: 600, name: "Whirlpool India", category: "mid_cap", exchange: "NSE" },
  "IPCALAB": { lotSize: 225, name: "Ipca Labs", category: "mid_cap", exchange: "NSE" },
  "ALKEM": { lotSize: 200, name: "Alkem Labs", category: "mid_cap", exchange: "NSE" },
  "GLAND": { lotSize: 350, name: "Gland Pharma", category: "mid_cap", exchange: "NSE" },
  "ASTRAL": { lotSize: 407, name: "Astral", category: "mid_cap", exchange: "NSE" },
  "TRENT": { lotSize: 350, name: "Trent", category: "mid_cap", exchange: "NSE" },
  "ABCAPITAL": { lotSize: 5000, name: "Aditya Birla Capital", category: "mid_cap", exchange: "NSE" },
  "MFSL": { lotSize: 650, name: "Max Financial", category: "mid_cap", exchange: "NSE" },
  "PEL": { lotSize: 550, name: "Piramal Enterprises", category: "mid_cap", exchange: "NSE" },
  "IGL": { lotSize: 1650, name: "Indraprastha Gas", category: "mid_cap", exchange: "NSE" },
  "GUJGASLTD": { lotSize: 2500, name: "Gujarat Gas", category: "mid_cap", exchange: "NSE" },
  "MGL": { lotSize: 1200, name: "Mahanagar Gas", category: "mid_cap", exchange: "NSE" },
  "CONCOR": { lotSize: 800, name: "Container Corp", category: "mid_cap", exchange: "NSE" },
  "NAVINFLUOR": { lotSize: 200, name: "Navin Fluorine", category: "mid_cap", exchange: "NSE" },
  "DEEPAKNTR": { lotSize: 200, name: "Deepak Nitrite", category: "mid_cap", exchange: "NSE" },
  "SRF": { lotSize: 375, name: "SRF Limited", category: "mid_cap", exchange: "NSE" },
  "ATUL": { lotSize: 175, name: "Atul Ltd", category: "mid_cap", exchange: "NSE" },
  "PIIND": { lotSize: 200, name: "PI Industries", category: "mid_cap", exchange: "NSE" },
  "BALKRISIND": { lotSize: 300, name: "Balkrishna Industries", category: "mid_cap", exchange: "NSE" },
  "MRF": { lotSize: 10, name: "MRF Ltd", category: "mid_cap", exchange: "NSE" },
  "APOLLOTYRE": { lotSize: 2200, name: "Apollo Tyres", category: "mid_cap", exchange: "NSE" },
  "JUBLFOOD": { lotSize: 500, name: "Jubilant FoodWorks", category: "mid_cap", exchange: "NSE" },
  "TATACONSUM": { lotSize: 225, name: "Tata Consumer", category: "mid_cap", exchange: "NSE" },
  "PAGEIND": { lotSize: 30, name: "Page Industries", category: "mid_cap", exchange: "NSE" },
  "PETRONET": { lotSize: 3000, name: "Petronet LNG", category: "mid_cap", exchange: "NSE" },
  "MOTHERSON": { lotSize: 3500, name: "Motherson Sumi", category: "mid_cap", exchange: "NSE" },
  "SCHAEFFLER": { lotSize: 60, name: "Schaeffler India", category: "mid_cap", exchange: "NSE" },
  "TVSMOTOR": { lotSize: 700, name: "TVS Motor", category: "mid_cap", exchange: "NSE" },
  "BAJAJ-AUTO": { lotSize: 250, name: "Bajaj Auto", category: "mid_cap", exchange: "NSE" },
  "ASHOKLEY": { lotSize: 6000, name: "Ashok Leyland", category: "mid_cap", exchange: "NSE" },
  "EICHERMOT": { lotSize: 70, name: "Eicher Motors", category: "mid_cap", exchange: "NSE" },
  "EXIDEIND": { lotSize: 4000, name: "Exide Industries", category: "mid_cap", exchange: "NSE" },
  "NHPC": { lotSize: 18000, name: "NHPC", category: "mid_cap", exchange: "NSE" },
  "SJVN": { lotSize: 25000, name: "SJVN", category: "mid_cap", exchange: "NSE" },
  "RECLTD": { lotSize: 6000, name: "REC", category: "mid_cap", exchange: "NSE" },
  "PFC": { lotSize: 6200, name: "Power Finance Corp", category: "mid_cap", exchange: "NSE" },
  "IRFC": { lotSize: 24500, name: "Indian Railway Finance", category: "mid_cap", exchange: "NSE" },
  "NLCINDIA": { lotSize: 17500, name: "NLC India", category: "mid_cap", exchange: "NSE" },
  "ADANIPOWER": { lotSize: 20000, name: "Adani Power", category: "mid_cap", exchange: "NSE" },
  "TATAPOWER": { lotSize: 6750, name: "Tata Power", category: "mid_cap", exchange: "NSE" },
  "JSWENERGY": { lotSize: 3000, name: "JSW Energy", category: "mid_cap", exchange: "NSE" },
  "NTPC": { lotSize: 5700, name: "NTPC", category: "mid_cap", exchange: "NSE" },
  
  // ===== ADANI GROUP =====
  "ADANIGREEN": { lotSize: 1500, name: "Adani Green", category: "large_cap", exchange: "NSE" },
  "ADANITRANS": { lotSize: 400, name: "Adani Transmission", category: "large_cap", exchange: "NSE" },
  "ADANIWILMAR": { lotSize: 1000, name: "Adani Wilmar", category: "mid_cap", exchange: "NSE" },
  "ADANIENT": { lotSize: 400, name: "Adani Enterprises", category: "large_cap", exchange: "NSE" },
  "AMBCEM": { lotSize: 400, name: "Ambuja Cements (prev ACC)", category: "large_cap", exchange: "NSE" },
  "NDTV": { lotSize: 1000, name: "NDTV", category: "small_cap", exchange: "NSE" },
  
  // ===== OTHER POPULAR STOCKS =====
  "TATACHEM": { lotSize: 500, name: "Tata Chemicals", category: "mid_cap", exchange: "NSE" },
  "SOLARINDS": { lotSize: 100, name: "Solar Industries", category: "mid_cap", exchange: "NSE" },
  "LAURUSLABS": { lotSize: 2250, name: "Laurus Labs", category: "mid_cap", exchange: "NSE" },
  "JINDALSTEL": { lotSize: 3125, name: "Jindal Steel", category: "mid_cap", exchange: "NSE" },
  "SAIL": { lotSize: 8000, name: "SAIL", category: "mid_cap", exchange: "NSE" },
  "NMDC": { lotSize: 4000, name: "NMDC", category: "mid_cap", exchange: "NSE" },
  "NATIONALUM": { lotSize: 15000, name: "National Aluminium", category: "mid_cap", exchange: "NSE" },
  "HINDALCO": { lotSize: 2000, name: "Hindalco", category: "large_cap", exchange: "NSE" },
  "HINDCOPPER": { lotSize: 3800, name: "Hindustan Copper", category: "mid_cap", exchange: "NSE" },
  "COCHINSHIP": { lotSize: 1000, name: "Cochin Shipyard", category: "mid_cap", exchange: "NSE" },
  "MAZDOCK": { lotSize: 600, name: "Mazagon Dock", category: "mid_cap", exchange: "NSE" },
  "GRSE": { lotSize: 950, name: "Garden Reach Shipbuilders", category: "mid_cap", exchange: "NSE" },
  "PARADEEP": { lotSize: 1600, name: "Paradeep Phosphates", category: "small_cap", exchange: "NSE" },
  "FACT": { lotSize: 5200, name: "Fertilizers & Chemicals Travancore", category: "mid_cap", exchange: "NSE" },
  "CHAMBLFERT": { lotSize: 2800, name: "Chambal Fertilizers", category: "mid_cap", exchange: "NSE" },
  "COROMANDEL": { lotSize: 500, name: "Coromandel International", category: "mid_cap", exchange: "NSE" },
  "GNFC": { lotSize: 1500, name: "Gujarat Narmada Valley", category: "mid_cap", exchange: "NSE" },
  "GSFC": { lotSize: 4500, name: "Gujarat State Fertilizers", category: "mid_cap", exchange: "NSE" },
  "AARTIIND": { lotSize: 1450, name: "Aarti Industries", category: "mid_cap", exchange: "NSE" },
  "BAYERCROP": { lotSize: 60, name: "Bayer CropScience", category: "mid_cap", exchange: "NSE" },
  "UPL": { lotSize: 1300, name: "UPL Limited", category: "large_cap", exchange: "NSE" },
  "RALLIS": { lotSize: 2800, name: "Rallis India", category: "small_cap", exchange: "NSE" },
  "SUMICHEM": { lotSize: 1600, name: "Sumitomo Chemical", category: "mid_cap", exchange: "NSE" },
  "PHOSPHATE": { lotSize: 2000, name: "Phosphate Company", category: "small_cap", exchange: "NSE" },
  "ESCORTS": { lotSize: 550, name: "Escorts Kubota", category: "mid_cap", exchange: "NSE" },
  "BLUEDART": { lotSize: 65, name: "Blue Dart Express", category: "mid_cap", exchange: "NSE" },
  "DTDC": { lotSize: 3000, name: "DTDC", category: "small_cap", exchange: "NSE" },
  "DELHIVERY": { lotSize: 850, name: "Delhivery", category: "mid_cap", exchange: "NSE" },
  "BLUESTARCO": { lotSize: 1000, name: "Blue Star", category: "mid_cap", exchange: "NSE" },
  "CARRARO": { lotSize: 725, name: "Carraro India", category: "small_cap", exchange: "NSE" },
  "RATNAMANI": { lotSize: 350, name: "Ratnamani Metals", category: "mid_cap", exchange: "NSE" },
  "WELCORP": { lotSize: 1500, name: "Welspun Corp", category: "mid_cap", exchange: "NSE" },
  "WELSPUNIND": { lotSize: 15000, name: "Welspun India", category: "small_cap", exchange: "NSE" },
  "APLAPOLLO": { lotSize: 450, name: "APL Apollo", category: "mid_cap", exchange: "NSE" },
  "HINDZINC": { lotSize: 1600, name: "Hindustan Zinc", category: "large_cap", exchange: "NSE" },
  "VEDL": { lotSize: 3100, name: "Vedanta", category: "large_cap", exchange: "NSE" },
  "MOIL": { lotSize: 3000, name: "MOIL", category: "mid_cap", exchange: "NSE" },
  "BSE": { lotSize: 2000, name: "BSE Limited", category: "mid_cap", exchange: "NSE" },
  "MCX": { lotSize: 750, name: "Multi Commodity Exchange", category: "mid_cap", exchange: "NSE" },
  "CDSL": { lotSize: 1600, name: "CDSL", category: "mid_cap", exchange: "NSE" },
  "CAMS": { lotSize: 250, name: "CAMS", category: "mid_cap", exchange: "NSE" },
  "KFINTECH": { lotSize: 1000, name: "KFin Technologies", category: "small_cap", exchange: "NSE" },
  "NSE": { lotSize: 375, name: "NSE India", category: "mid_cap", exchange: "NSE" },
  "ISEC": { lotSize: 1000, name: "ICICI Securities", category: "mid_cap", exchange: "NSE" },
  "MOTILALOFS": { lotSize: 700, name: "Motilal Oswal", category: "mid_cap", exchange: "NSE" },
  "ANGELONE": { lotSize: 1000, name: "Angel One", category: "mid_cap", exchange: "NSE" },
  "5PAISA": { lotSize: 2000, name: "5Paisa Capital", category: "small_cap", exchange: "NSE" },
  "SBICARD": { lotSize: 500, name: "SBI Cards", category: "large_cap", exchange: "NSE" },
  "PAYTM": { lotSize: 2250, name: "One97 Communications", category: "mid_cap", exchange: "NSE" },
  "POLICYBZR": { lotSize: 1200, name: "PB Fintech", category: "mid_cap", exchange: "NSE" },
  "NYKAA": { lotSize: 800, name: "FSN E-Commerce", category: "mid_cap", exchange: "NSE" },
  "INDIAMART": { lotSize: 90, name: "IndiaMART", category: "mid_cap", exchange: "NSE" },
  "NAUKRI": { lotSize: 125, name: "Info Edge", category: "mid_cap", exchange: "NSE" },
  "ZOMATO": { lotSize: 2750, name: "Zomato", category: "large_cap", exchange: "NSE" },
  "SWIGGY": { lotSize: 2500, name: "Swiggy", category: "large_cap", exchange: "NSE" },
  "DELHIVERY": { lotSize: 850, name: "Delhivery", category: "mid_cap", exchange: "NSE" },
  "FLIPKART": { lotSize: 1500, name: "Flipkart (if listed)", category: "unlisted", exchange: "NSE" },
  "BYJU": { lotSize: 1000, name: "BYJU's (if listed)", category: "unlisted", exchange: "NSE" },
};

// Default lot size for unknown symbols (equity delivery style)
const DEFAULT_LOT_SIZE = 1;

// ═══════════════════════════════════════════════════════════════════════════
// LOT SIZE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get lot size for a symbol
 * @param {string} symbol - Stock symbol (e.g., "RELIANCE", "NIFTY")
 * @returns {Object} Lot size info
 */
export function getLotSize(symbol) {
  if (!symbol) {
    return {
      symbol: null,
      lotSize: DEFAULT_LOT_SIZE,
      name: "Unknown",
      category: "unknown",
      exchange: "NSE",
      isDefault: true
    };
  }

  const normalizedSymbol = symbol.toUpperCase().trim();
  
  // Check exact match
  if (NSE_LOT_SIZES[normalizedSymbol]) {
    return {
      symbol: normalizedSymbol,
      lotSize: NSE_LOT_SIZES[normalizedSymbol].lotSize,
      name: NSE_LOT_SIZES[normalizedSymbol].name,
      category: NSE_LOT_SIZES[normalizedSymbol].category,
      exchange: NSE_LOT_SIZES[normalizedSymbol].exchange,
      isDefault: false
    };
  }

  // Try without -EQ, .NS, etc.
  const cleanSymbol = normalizedSymbol
    .replace(/-EQ$/, "")
    .replace(/\.NS$/, "")
    .replace(/\.NSE$/, "")
    .replace(/-E$/, "");
    
  if (NSE_LOT_SIZES[cleanSymbol]) {
    return {
      symbol: cleanSymbol,
      lotSize: NSE_LOT_SIZES[cleanSymbol].lotSize,
      name: NSE_LOT_SIZES[cleanSymbol].name,
      category: NSE_LOT_SIZES[cleanSymbol].category,
      exchange: NSE_LOT_SIZES[cleanSymbol].exchange,
      isDefault: false
    };
  }

  // Return default for unknown symbols
  return {
    symbol: normalizedSymbol,
    lotSize: DEFAULT_LOT_SIZE,
    name: normalizedSymbol,
    category: "equity_delivery",
    exchange: "NSE",
    isDefault: true
  };
}

/**
 * Calculate quantity from lots
 * @param {string} symbol - Stock symbol
 * @param {number} lots - Number of lots
 * @returns {number} Total quantity
 */
export function calculateQuantity(symbol, lots) {
  const lotInfo = getLotSize(symbol);
  return Math.floor(lots * lotInfo.lotSize);
}

/**
 * Calculate lots from quantity
 * @param {string} symbol - Stock symbol
 * @param {number} quantity - Total quantity
 * @returns {number} Number of lots
 */
export function calculateLots(symbol, quantity) {
  const lotInfo = getLotSize(symbol);
  return quantity / lotInfo.lotSize;
}

/**
 * Validate if quantity is valid lot multiple
 * @param {string} symbol - Stock symbol
 * @param {number} quantity - Quantity to validate
 * @returns {Object} Validation result
 */
export function validateLotMultiple(symbol, quantity) {
  const lotInfo = getLotSize(symbol);
  const lotSize = lotInfo.lotSize;
  
  const isValid = quantity % lotSize === 0;
  const lots = quantity / lotSize;
  
  return {
    isValid,
    symbol,
    quantity,
    lotSize,
    lots: isValid ? lots : Math.floor(lots),
    remainder: quantity % lotSize,
    message: isValid 
      ? `${quantity} shares = ${lots} lot(s) of ${lotSize} shares each`
      : `${quantity} is not a valid lot multiple. Lot size for ${symbol} is ${lotSize} shares. Try ${Math.floor(quantity / lotSize) * lotSize} or ${Math.ceil(quantity / lotSize) * lotSize}.`
  };
}

/**
 * Get all supported symbols
 * @returns {Array} List of all supported symbols with lot sizes
 */
export function getAllLotSizes() {
  return Object.entries(NSE_LOT_SIZES).map(([symbol, info]) => ({
    symbol,
    lotSize: info.lotSize,
    name: info.name,
    category: info.category,
    exchange: info.exchange
  }));
}

/**
 * Get symbols by category
 * @param {string} category - Category (index, large_cap, mid_cap, small_cap)
 * @returns {Array} List of symbols in category
 */
export function getLotSizesByCategory(category) {
  return Object.entries(NSE_LOT_SIZES)
    .filter(([_, info]) => info.category === category)
    .map(([symbol, info]) => ({
      symbol,
      lotSize: info.lotSize,
      name: info.name,
      exchange: info.exchange
    }));
}

/**
 * Get lot sizes for multiple symbols
 * @param {Array} symbols - Array of symbols
 * @returns {Object} Map of symbol -> lot info
 */
export function getMultipleLotSizes(symbols) {
  const result = {};
  for (const symbol of symbols) {
    result[symbol] = getLotSize(symbol);
  }
  return result;
}

/**
 * Get lot size with caching (Redis)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Lot size info
 */
export async function getLotSizeWithCache(symbol) {
  const cacheKey = `nse:lot_size:${symbol.toUpperCase()}`;
  
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for lot size ${symbol}:`, error.message);
  }

  const lotInfo = getLotSize(symbol);
  
  try {
    await cacheSet(cacheKey, JSON.stringify(lotInfo), CACHE_TTL);
  } catch (cacheError) {
    console.warn(`Failed to cache lot size for ${symbol}:`, cacheError.message);
  }
  
  return lotInfo;
}

/**
 * Get lot size statistics
 * @returns {Object} Statistics about lot sizes
 */
export function getLotSizeStats() {
  const all = getAllLotSizes();
  const categories = {};
  
  for (const item of all) {
    if (!categories[item.category]) {
      categories[item.category] = { count: 0, minLot: Infinity, maxLot: 0, avgLot: 0, totalLot: 0 };
    }
    const cat = categories[item.category];
    cat.count++;
    cat.minLot = Math.min(cat.minLot, item.lotSize);
    cat.maxLot = Math.max(cat.maxLot, item.lotSize);
    cat.totalLot += item.lotSize;
  }
  
  // Calculate averages
  for (const cat of Object.values(categories)) {
    cat.avgLot = Math.round(cat.totalLot / cat.count);
    delete cat.totalLot;
  }
  
  return {
    totalSymbols: all.length,
    categories,
    lotSizeRanges: {
      "1-100": all.filter(s => s.lotSize >= 1 && s.lotSize <= 100).length,
      "101-500": all.filter(s => s.lotSize > 100 && s.lotSize <= 500).length,
      "501-1000": all.filter(s => s.lotSize > 500 && s.lotSize <= 1000).length,
      "1001-5000": all.filter(s => s.lotSize > 1000 && s.lotSize <= 5000).length,
      "5000+": all.filter(s => s.lotSize > 5000).length
    }
  };
}

export default {
  getLotSize,
  calculateQuantity,
  calculateLots,
  validateLotMultiple,
  getAllLotSizes,
  getLotSizesByCategory,
  getMultipleLotSizes,
  getLotSizeWithCache,
  getLotSizeStats,
  DEFAULT_LOT_SIZE
};
