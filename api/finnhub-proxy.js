// Proxy sécurisé pour l'API Finnhub - Fonction serverless Vercel
export default async function handler(req, res) {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Gestion des requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Seules les requêtes GET sont autorisées
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Récupération de la clé API depuis les variables d'environnement Vercel
        const API_KEY = process.env.FINNHUB_API_KEY;
        
        if (!API_KEY) {
            console.error('FINNHUB_API_KEY not found in environment variables');
            return res.status(500).json({ error: 'API configuration error' });
        }

        // Récupération des paramètres de la requête
        const { endpoint, symbol, resolution, from, to } = req.query;

        if (!endpoint || !symbol) {
            return res.status(400).json({ error: 'Missing required parameters: endpoint and symbol' });
        }

        // Validation des endpoints autorisés (sécurité)
        const allowedEndpoints = ['quote', 'stock/candle'];
        if (!allowedEndpoints.includes(endpoint)) {
            return res.status(400).json({ error: 'Endpoint not allowed' });
        }

        // Construction de l'URL Finnhub
        let finnhubUrl = `https://finnhub.io/api/v1/${endpoint}?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`;
        
        // Ajout des paramètres spécifiques aux données historiques
        if (endpoint === 'stock/candle') {
            if (!resolution || !from || !to) {
                return res.status(400).json({ error: 'Missing required parameters for candle data: resolution, from, to' });
            }
            finnhubUrl += `&resolution=${encodeURIComponent(resolution)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        }

        // Appel à l'API Finnhub
        const response = await fetch(finnhubUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Gave-Portfolio-App/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Validation des données reçues
        if (endpoint === 'quote') {
            if (!data.c || data.c <= 0) {
                return res.status(404).json({ error: 'No valid price data found' });
            }
        } else if (endpoint === 'stock/candle') {
            if (data.s !== 'ok' || !data.c || data.c.length === 0) {
                return res.status(404).json({ error: 'No valid historical data found' });
            }
        }

        // Log pour monitoring (sans exposer la clé API)
        console.log(`[${new Date().toISOString()}] ${endpoint} request for ${symbol} - Success`);

        // Retour des données avec cache headers
        res.setHeader('Cache-Control', 'public, max-age=300'); // Cache 5 minutes
        res.status(200).json(data);

    } catch (error) {
        console.error('Proxy error:', error.message);
        
        // Retour d'erreur générique (ne pas exposer les détails internes)
        res.status(500).json({ 
            error: 'Failed to fetch market data',
            timestamp: new Date().toISOString()
        });
    }
}

