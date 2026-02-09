// zerodha-scan.js
window.startZerodhaScan = function() {
    console.log("Zerodha Scan Started...");
// Replace with your actual Kite API Key from the Developer Console
const KITE_API_KEY = 'qij1bqvcu5pe9pr3';
const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${KITE_API_KEY}`;

window.location.href = loginUrl;
};

/**
 * Initializes the Scan Portfolio button.
 * Should be called once when the DOM is loaded.
 */
export function initZerodhaScan() {
    const scanBtn = document.getElementById('zerodha-scan-btn');
    
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            // Optional: Add a loading state to the button
            scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            scanBtn.disabled = true;

            console.log("Harsh GPT is warming up the financial roaster...");
            
            // Redirect to Zerodha's official secure login
            const authUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${KITE_API_KEY}`;
            window.location.href = authUrl;
        });
    }
}

/**
 * Checks if the user has just been redirected back from Zerodha.
 * If a request_token is found, it processes it and cleans the URL.
 */
export function handleZerodhaCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');

    if (requestToken) {
        // 1. Immediately clean the URL to hide the token and keep the UI pretty
        window.history.replaceState({}, document.title, window.location.pathname);
        
        console.log("Request token captured. Fetching portfolio data...");
        
        // 2. Exchange token for data via your Vercel backend
        fetchPortfolioData(requestToken);
    }
}

/**
 * Communicates with your Vercel backend to get the actual portfolio stats.
 * @param {string} token - The request_token from Zerodha.
 */
async function fetchPortfolioData(token) {
    try {
        // This hits your Vercel Serverless Function (api/zerodha/callback.js)
        const response = await fetch(`/api/zerodha/callback?token=${token}`);
        
        if (!response.ok) throw new Error("Backend failed to exchange token.");

        const data = await response.json();
        
        // 3. Send the data to your Harsh GPT UI
        // We assume 'displayHarshMessage' is your global function for showing AI text
        if (window.displayHarshMessage) {
            const holdingsCount = data.holdings ? data.holdings.length : 0;
            const cashBalance = data.margins ? data.margins.equity.available.cash : "Unknown";
            
            const message = `Financial Scan Complete: I found ${holdingsCount} stocks in your mess of a portfolio. You have ₹${cashBalance} sitting idle. Stop being lazy and do something with it.`;
            
            window.displayHarshMessage(message);
        }
    } catch (error) {
        console.error("Financial Scan Error:", error);
        if (window.displayHarshMessage) {
            window.displayHarshMessage("I tried to scan your portfolio, but even Zerodha's servers are embarrassed by your losses. Try again later.");
        }
    }
}
