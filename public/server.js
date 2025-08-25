const http = require('http');
const fs = require('fs');
const path = require('path');

// Charge .env.local si présent (clé FINNHUB_API_KEY)
(() => {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
            if (m) {
                const key = m[1];
                let value = m[2];
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith('\'') && value.endsWith('\'')) value = value.slice(1, -1);
                process.env[key] = value;
            }
        });
        console.log('[env] .env.local chargé');
    }
})();

const PORT = process.env.PORT || 3000;

function sendJson(res, status, data, headers = {}) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...headers,
    });
    res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
    const urlPath = req.url.split('?')[0];
    const safeMap = {
        '/': 'index.html',
        '/index.html': 'index.html',
        '/style.css': 'style.css',
        '/app.js': 'app.js',
    };

    const file = safeMap[urlPath];
    if (!file) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
    }

    const fullPath = path.join(__dirname, file);
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Internal Server Error');
            return;
        }

        const contentType = file.endsWith('.html') ? 'text/html; charset=utf-8'
            : file.endsWith('.css') ? 'text/css; charset=utf-8'
            : file.endsWith('.js') ? 'application/javascript; charset=utf-8'
            : 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

async function handleProxy(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    if (req.method !== 'GET') {
        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    try {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        const endpoint = urlObj.searchParams.get('endpoint');
        const symbol = urlObj.searchParams.get('symbol');
        const resolution = urlObj.searchParams.get('resolution');
        const from = urlObj.searchParams.get('from');
        const to = urlObj.searchParams.get('to');

        if (!endpoint || !symbol) {
            return sendJson(res, 400, { error: 'Missing required parameters: endpoint and symbol' });
        }

        const allowedEndpoints = ['quote', 'stock/candle'];
        if (!allowedEndpoints.includes(endpoint)) {
            return sendJson(res, 400, { error: 'Endpoint not allowed' });
        }

        // Proxy hybride : Finnhub en premier, Yahoo Finance en fallback
        let result = null;
        let source = '';

        // 1. Essayer Finnhub d'abord
        try {
            result = await tryFinnhub(endpoint, symbol, resolution, from, to);
            if (result.success) {
                source = 'Finnhub';
                console.log(`[${new Date().toISOString()}] ${endpoint} for ${symbol} - Success via ${source}`);
                return sendJson(res, 200, result.data);
            }
        } catch (error) {
            console.log(`[${new Date().toISOString()}] Finnhub failed for ${symbol}: ${error.message}`);
        }

        // 2. Si Finnhub échoue, essayer Yahoo Finance
        try {
            console.log(`[${new Date().toISOString()}] Trying Yahoo Finance for ${symbol}...`);
            result = await tryYahooFinance(endpoint, symbol, resolution, from, to);
            if (result.success) {
                source = 'Yahoo Finance';
                console.log(`[${new Date().toISOString()}] ${endpoint} for ${symbol} - Success via ${source}`);
                return sendJson(res, 200, result.data);
            }
        } catch (error) {
            console.log(`[${new Date().toISOString()}] Yahoo Finance failed for ${symbol}: ${error.message}`);
            console.log(`[${new Date().toISOString()}] Full error:`, error);
        }

        // 3. Si tout échoue
        return sendJson(res, 404, { 
            error: 'Symbol not found on any data source',
            symbol: symbol,
            endpoint: endpoint,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Hybrid proxy error:', err);
        sendJson(res, 500, { error: 'Failed to fetch market data', timestamp: new Date().toISOString() });
    }
}

// Fonction pour essayer Finnhub
async function tryFinnhub(endpoint, symbol, resolution, from, to) {
    const API_KEY = process.env.FINNHUB_API_KEY;
    if (!API_KEY) {
        throw new Error('FINNHUB_API_KEY missing');
    }

    let finnhubUrl = `https://finnhub.io/api/v1/${endpoint}?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`;
    if (endpoint === 'stock/candle') {
        if (!resolution || !from || !to) {
            throw new Error('Missing parameters for candle data');
        }
        finnhubUrl += `&resolution=${encodeURIComponent(resolution)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }

    const response = await fetch(finnhubUrl, { 
        method: 'GET', 
        headers: { 'User-Agent': 'Gave-Portfolio-App/1.0' } 
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validation des données
    if (endpoint === 'quote') {
        if (!data.c || data.c <= 0) {
            throw new Error('No valid price data found');
        }
    } else if (endpoint === 'stock/candle') {
        if (data.s !== 'ok' || !data.c || data.c.length === 0) {
            throw new Error('No valid historical data found');
        }
    }

    return { success: true, data: data };
}

// Fonction pour essayer Yahoo Finance
async function tryYahooFinance(endpoint, symbol, resolution, from, to) {
    if (endpoint === 'quote') {
        // Endpoint Yahoo Finance pour les quotes
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        
        const response = await fetch(yahooUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Log minimal pour éviter le spam
        console.log(`[${new Date().toISOString()}] Yahoo Finance data received for ${symbol}`);
        
        // Conversion du format Yahoo vers le format Finnhub
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators.quote[0];
            
            // Validation plus robuste des données
            const currentPrice = meta.regularMarketPrice || quote.close[0] || 0;
            const previousClose = meta.chartPreviousClose || quote.close[0] || 0;
            const openPrice = meta.regularMarketOpen || quote.open[0] || currentPrice;
            const highPrice = meta.regularMarketDayHigh || quote.high[0] || currentPrice;
            const lowPrice = meta.regularMarketDayLow || quote.low[0] || currentPrice;
            
            if (!currentPrice || currentPrice <= 0) {
                throw new Error(`Invalid price data: currentPrice=${currentPrice}, previousClose=${previousClose}`);
            }
            
            // Format compatible avec l'app
            const finnhubFormat = {
                c: currentPrice,                           // current price
                d: currentPrice - previousClose,           // change
                dp: previousClose > 0 ? ((currentPrice - previousClose) / previousClose * 100) : 0, // change percent
                h: highPrice,                              // high
                l: lowPrice,                               // low
                o: openPrice,                              // open
                pc: previousClose,                         // previous close
                t: Math.floor(Date.now() / 1000)          // timestamp
            };

            // Log minimal pour éviter le spam
            // Log minimal pour éviter le spam
            console.log(`[${new Date().toISOString()}] Yahoo Finance converted for ${symbol}: ${finnhubFormat.c}€`);
            return { success: true, data: finnhubFormat };
        } else {
            console.log(`[${new Date().toISOString()}] Yahoo Finance data structure invalid for ${symbol}`);
            throw new Error('Invalid Yahoo Finance data format');
        }
    } else if (endpoint === 'stock/candle') {
        // Endpoint Yahoo Finance pour les données historiques
        const toDate = Math.floor(Date.now() / 1000);
        const fromDate = from || (toDate - (7 * 365 * 24 * 60 * 60)); // 7 ans par défaut
        
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1wk&range=7y&period1=${fromDate}&period2=${toDate}`;
        
        const response = await fetch(yahooUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Conversion du format Yahoo vers le format Finnhub
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quotes = result.indicators.quote[0];
            
            // Format compatible avec l'app
            const finnhubFormat = {
                s: 'ok',
                t: timestamps,
                c: quotes.close,
                o: quotes.open,
                h: quotes.high,
                l: quotes.low,
                v: quotes.volume
            };

            return { success: true, data: finnhubFormat };
        } else {
            throw new Error('Invalid Yahoo Finance data format');
        }
    }

    throw new Error('Unsupported endpoint for Yahoo Finance');
}

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/finnhub-proxy')) {
        return handleProxy(req, res);
    }
    return serveStatic(req, res);
});

server.listen(PORT, () => {
    console.log(`Local server running at http://localhost:${PORT}`);
});


