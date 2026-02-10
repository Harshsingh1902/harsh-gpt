// api/exchange.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { request_token } = req.body;
    const API_KEY = 'qij1bqvcu5pe9pr3';
    // Ensure this matches your Vercel Environment Variable name
    const API_SECRET = process.env.KITE_API_SECRET; 

    const crypto = require('crypto');
    const message = API_KEY + request_token + API_SECRET;
    const checksum = crypto.createHash('sha256').update(message).digest('hex');

    try {
        // STEP 1: Exchange request_token for access_token
        const tokenResponse = await fetch('https://api.kite.trade/session/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                api_key: API_KEY,
                request_token: request_token,
                checksum: checksum
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.status !== 'success') {
            return res.status(400).json(tokenData);
        }

        const accessToken = tokenData.data.access_token;

        // STEP 2: Immediately fetch holdings using the new access_token
        // Doing this here bypasses mobile CORS issues entirely
        const holdingsResponse = await fetch('https://api.kite.trade/portfolio/holdings', {
            method: 'GET',
            headers: {
                'Authorization': `token ${API_KEY}:${accessToken}`,
                'X-Kite-Version': '3'
            }
        });

        const holdingsData = await holdingsResponse.json();

        // Send the final holdings data back to the frontend
        res.status(200).json(holdingsData);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}