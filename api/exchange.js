// This runs on the server (Vercel) to bypass CORS and hide your secret
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { request_token } = req.body;
    const API_KEY = 'qij1bqvcu5pe9pr3';
    // We get this from Vercel Environment Variables for safety
    const API_SECRET = process.env.KITE_API_SECRET; 

    const crypto = require('crypto');
    const message = API_KEY + request_token + API_SECRET;
    const checksum = crypto.createHash('sha256').update(message).digest('hex');

    try {
        const response = await fetch('https://api.kite.trade/session/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                api_key: API_KEY,
                request_token: request_token,
                checksum: checksum
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
}