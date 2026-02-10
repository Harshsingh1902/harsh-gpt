// --- 1. CONFIGURATION & INITIALIZATION ---
const _sbURL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const _sbKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';
const _sbClient = window.supabase ? window.supabase.createClient(_sbURL, _sbKEY) : null;

// --- ZERODHA CALLBACK HANDLER ---
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');

    if (requestToken) {
        console.log("Token received! Processing Zerodha linking...");
        
        // Remove the token from the URL so it looks clean
        window.history.replaceState({}, document.title, "/");

        // Send this token to your backend or process it
        if (typeof handleZerodhaToken === 'function') {
            handleZerodhaToken(requestToken);
        } else {
            appendMessage('bot', "Linking successful! Now fetching your portfolio... 📈");
            // Trigger your logic to exchange token for access_token here
        }
    } else if (urlParams.get('status') === 'error') {
        appendMessage('bot', "Zerodha linking failed. Please check your credentials.");
    }
});

// --- ZERODHA ENGINE FUNCTIONS ---

// 1. EXCHANGE: Converts the temporary request_token into a permanent access_token
async function handleZerodhaToken(requestToken) {
    const API_KEY = 'qij1bqvcu5pe9pr3';
    // REPLACE 'YOUR_ACTUAL_KITE_API_SECRET' with the secret from your Zerodha Dashboard
    const API_SECRET = 'mlzsvbgt1k0i12jsa8o8aqut7060g2wf'; 

    try {
        // Generate the mandatory SHA256 Checksum (api_key + request_token + api_secret)
        const message = API_KEY + requestToken + API_SECRET;
        const checksum = await generateSHA256(message);

        console.log("Exchanging token for session...");

        // Call Zerodha to get the Session
        const response = await fetch('https://api.kite.trade/session/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                'api_key': API_KEY,
                'request_token': requestToken,
                'checksum': checksum
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            console.log("Access Token Obtained!");
            appendMessage('bot', "Zerodha Linked! Analyzing your portfolio now... 📈");
            
            // Now use the access_token to get the actual holdings
            fetchPortfolioData(result.data.access_token, API_KEY);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Zerodha Sync Error:", error);
        appendMessage('bot', "Linking failed: " + error.message);
    }
}

// 2. FETCH: Uses the new access_token to get your stock holdings
async function fetchPortfolioData(accessToken, apiKey) {
    try {
        const response = await fetch('https://api.kite.trade/portfolio/holdings', {
            headers: {
                'Authorization': `token ${apiKey}:${accessToken}`,
                'X-Kite-Version': '3'
            }
        });
        const holdings = await response.json();
        
        if (holdings.status === 'success') {
            const data = holdings.data;
            
            if (data.length === 0) {
                appendMessage('bot', "Your portfolio is empty or Zerodha hasn't updated today yet.");
                return;
            }

            // Create a summary for the AI to read
            const portfolioSummary = data.map(s => 
                `${s.tradingsymbol}: ${s.quantity} shares (Avg: ${s.average_price})`
            ).join(', ');

            // Send to AI for analysis
            // NOTE: Ensure your AI function is named 'sendMessage' or 'getAIResponse' correctly
            if (typeof sendMessage === 'function') {
                sendMessage(`I just linked my Zerodha. Here is my portfolio: ${portfolioSummary}. Please analyze it for risks and gains.`);
            } else {
                console.log("Portfolio Data:", portfolioSummary);
                appendMessage('bot', "I've fetched your data, but I couldn't find your AI chat function to analyze it.");
            }
        }
    } catch (err) {
        console.error("Data Fetch Error:", err);
        appendMessage('bot', "Error fetching holdings. Please try again.");
    }
}

// 3. HELPER: Generates the SHA256 security hash required by Zerodha
async function generateSHA256(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- 2. GLOBAL UTILITY FUNCTIONS ---
window.copyToClipboard = function(content, btn) {
    navigator.clipboard.writeText(content).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = "✅";
        setTimeout(() => { btn.innerHTML = original; }, 2000);
    }).catch(err => console.error("Copy failed", err));
};

// --- 3. THE UNIFIED MESSAGE FUNCTION ---
function appendMessage(role, text, imageFile = null) {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return null;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`; 
    if (role === 'bot') msgDiv.classList.add('harsh-message');

    // Fix: Handle Image Display (Instant local preview or URL)
    if (imageFile) {
        const imgPreview = document.createElement("img");
        imgPreview.src = typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile);
        imgPreview.className = "chat-img-preview"; // Uses the CSS class we defined
        msgDiv.appendChild(imgPreview);
    }

    // Handle Text
    if (text) {
        const textSpan = document.createElement('span');
        textSpan.innerText = text;
        msgDiv.appendChild(textSpan);
    }

    // Only add copy button for real bot replies
    const isGreeting = text?.includes("Welcome") || text?.includes("Hello") || text?.includes("thinking");
    if (role === 'bot' && !isGreeting && text) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.onclick = function() { window.copyToClipboard(text, this); };
        msgDiv.appendChild(copyBtn);
    }

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msgDiv;
}

// --- 4. DOM ELEMENTS ---
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const voiceBtn = document.getElementById("voiceBtn");
const loginBtn = document.getElementById("loginBtn");
const accountBtn = document.getElementById("accountBtn");
const menuBtn = document.getElementById("menuBtn");
const historyList = document.getElementById("chat-history-list");
const imgInput = document.getElementById('imageInput');
const previewBox = document.getElementById('imagePreviewBox');
const previewImg = document.getElementById('previewImg');
const fileNameSpan = document.getElementById('fileName');
const cancelBtn = document.getElementById('cancelImg');
const zerodhaSidebarBtn = document.getElementById("zerodha-sidebar-btn"); // Added for Sidebar

// --- 5. CHAT LOGIC (Unified & Portfolio Aware) ---
// Note: We are using ONE single handleSend to prevent "red bar" duplicate errors
async function handleSend(e) {
    if (e) e.preventDefault(); 

    const message = userInput.value.trim();
    const imageFile = imgInput ? imgInput.files[0] : null;
    
    // Safety check
    if (!message && !imageFile) return;

    // --- NEW: GRAB PORTFOLIO DATA FROM STORAGE ---
    const rawPortfolio = localStorage.getItem('zerodha_portfolio');
    const portfolioData = rawPortfolio ? JSON.parse(rawPortfolio) : null;

    // 1. User Message (Immediate UI Update)
    appendMessage('user', message, imageFile);
    
    // Clear inputs immediately
    userInput.value = "";
    if (imgInput) imgInput.value = "";
    if (previewBox) previewBox.style.display = "none";

    // 2. Bot Placeholder
    const bDiv = appendMessage('bot', "Harsh GPT is thinking...");

    try {
        let uId = "guest";
        let imageUrl = null;

        // Securely get the user session
        if (_sbClient) {
            const { data: { session } } = await _sbClient.auth.getSession();
            if (session) uId = session.user.id;
        }

        // 3. Image Upload (Only if logged in)
        if (imageFile && _sbClient && uId !== "guest") {
            const fileName = `${uId}/${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await _sbClient.storage
                .from('chat-images')
                .upload(fileName, imageFile);
            
            if (uploadError) {
                console.error("Supabase Upload Error:", uploadError.message);
            } else {
                const { data: { publicUrl } } = _sbClient.storage
                    .from('chat-images')
                    .getPublicUrl(fileName);
                imageUrl = publicUrl;
            }
        }

        // 4. API Request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message || "Analyze this image.", 
                userId: uId, 
                imageUrl: imageUrl,
                portfolioData: portfolioData // Added Portfolio Context
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        
        const data = await res.json();
        
        // 5. Finalize Bot Response
        if (data && data.reply) {
            bDiv.classList.add('harsh-message');
            bDiv.innerHTML = `<span>${data.reply}</span>`;

            // Voice Support
            if (typeof HarshVoice !== 'undefined' && HarshVoice.isEnabled) {
                HarshVoice.speak(data.reply);
            }

            // Copy Button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '📋';
            copyBtn.onclick = function() { window.copyToClipboard(data.reply, this); };
            bDiv.appendChild(copyBtn);
            
            // Refresh History
            if (uId !== "guest") loadHistory(uId);
        } else {
            bDiv.innerText = "Harsh GPT: I'm speechless (Empty response).";
        }

    } catch (err) {
        console.error("DETAILED CHAT ERROR:", err);
        if (bDiv) {
            bDiv.innerText = `Harsh GPT: Error - ${err.name === 'AbortError' ? 'Request timed out' : err.message}`;
        }
    }
}

// --- 6. IMAGE PREVIEW & UI LOGIC ---
if (imgInput) {
    imgInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                fileNameSpan.textContent = file.name;
                previewBox.style.display = 'flex'; 
            };
            reader.readAsDataURL(file);
        }
    });
}
if (cancelBtn) {
    cancelBtn.onclick = () => {
        imgInput.value = ""; 
        previewBox.style.display = 'none';
    };
}

window.toggleSidebar = () => document.getElementById('sidebar').classList.toggle('sidebar-open');
window.openSettings = () => document.getElementById('settings-modal').classList.remove('hidden');
window.closeSettings = () => document.getElementById('settings-modal').classList.add('hidden');
window.setTheme = (theme) => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('harsh-gpt-theme', theme); };
window.setFont = (fontClass) => { document.body.className = fontClass; localStorage.setItem('harsh-gpt-font', fontClass); };

// --- 7. AUTH, HISTORY & NAVIGATION ---
if (_sbClient) {
    loginBtn.onclick = async (e) => { 
        e.preventDefault();
        const { error } = await _sbClient.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { 
                scopes: 'https://www.googleapis.com/auth/gmail.readonly', 
                queryParams: { access_type: 'offline', prompt: 'select_account consent' },
                redirectTo: window.location.origin 
            } 
        }); 
        if (error) console.error("Login Error:", error.message);
    };

    window.handleLogout = async () => { 
        if (confirm("Do you want to logout?")) { 
            await _sbClient.auth.signOut(); 
            window.location.reload(); 
        } 
    };

    window.startNewChat = () => {
        chatContainer.innerHTML = '';
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if (session) {
                appendMessage('bot', `New Chat Started. How can I help, ${session.user.user_metadata.full_name || 'User'}?`);
            } else {
                appendMessage('bot', "Hello 👋 I’m Harsh GPT. Login for permanent memory!");
            }
        });
        if (document.getElementById('sidebar')) document.getElementById('sidebar').classList.remove('sidebar-open');
    };

    window.goHome = () => { window.location.reload(); };

    _sbClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
            chatContainer.innerHTML = '';
            if (session) {
                loginBtn.style.display = 'none';
                accountBtn.style.display = 'block';
                if (menuBtn) menuBtn.style.display = 'block';
                appendMessage('bot', `Welcome back, ${session.user.user_metadata.full_name || 'User'}! 👋`);
                loadHistory(session.user.id);
            } else {
                loginBtn.style.display = 'block';
                accountBtn.style.display = 'none';
                if (menuBtn) menuBtn.style.display = 'none';
                appendMessage('bot', "Hello 👋 I’m Harsh GPT. Please login to enable permanent memory!");
            }
        }
    });
}

async function loadHistory(uId) {
    if (!historyList || !_sbClient) return;
    const { data, error } = await _sbClient
        .from('chats')
        .select('*')
        .eq('user_id', uId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) return;

    if (data && data.length > 0) {
        historyList.innerHTML = data.map(chat => `
            <div class="history-item" onclick="viewPastChat(\`${chat.user_message.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`, \`${chat.bot_response ? chat.bot_response.replace(/`/g, '\\`').replace(/\$/g, '\\$') : '...'}\`)">
                💬 ${chat.user_message.substring(0, 25)}...
            </div>
        `).join('');
    } else {
        historyList.innerHTML = '<p class="empty-history">No history yet</p>';
    }
}

window.viewPastChat = (uMsg, bRes) => {
    chatContainer.innerHTML = '';
    appendMessage('user', uMsg);
    appendMessage('bot', bRes);
    if (document.getElementById('sidebar')) document.getElementById('sidebar').classList.remove('sidebar-open');
};

// --- 8. MIC & KILL SWITCH ---
if (voiceBtn) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        voiceBtn.onclick = () => { recognition.start(); voiceBtn.textContent = "🛑"; };
        recognition.onresult = (e) => { 
            userInput.value = e.results[0][0].transcript; 
            voiceBtn.textContent = "🎤"; 
            handleSend(); 
        };
        recognition.onend = () => { voiceBtn.textContent = "🎤"; };
    }
}

window.handleKillSwitch = async () => {
    if (!confirm("⚠️ PERMANENTLY delete history?")) return;
    const { data: { user } } = await _sbClient.auth.getUser();
    if (user) {
        await _sbClient.from('chats').delete().eq('user_id', user.id);
        alert("Erased!");
        location.reload();
    }
};

// --- 9. INITIALIZATION & ZERODHA CALLBACKS ---
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Set UI Preferences
    const savedTheme = localStorage.getItem('harsh-gpt-theme') || 'antariksh';
    const savedFont = localStorage.getItem('harsh-gpt-font') || 'font-default';
    if (window.setTheme) window.setTheme(savedTheme);
    if (window.setFont) window.setFont(savedFont);

    // 2. Auth Session Capture
    if (_sbClient) {
        try {
            const { data: { session } } = await _sbClient.auth.getSession();
            if (session) {
                if (loginBtn) loginBtn.style.display = 'none';
                if (accountBtn) accountBtn.style.display = 'block';
                if (menuBtn) menuBtn.style.display = 'block';
                if (chatContainer && chatContainer.innerHTML.trim() === "") {
                    appendMessage('bot', `Welcome back, ${session.user.user_metadata.full_name || 'User'}! 👋`);
                    loadHistory(session.user.id);
                }
            }
        } catch (err) { console.error("Auth Init Error", err); }
    }

    // --- NEW: ZERODHA CALLBACK HANDLER ---
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');
    if (requestToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const bDiv = appendMessage('bot', "Linking your Zerodha portfolio... Please wait.");
        try {
            const response = await fetch(`/api/zerodha/callback?token=${requestToken}`);
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('zerodha_portfolio', JSON.stringify(data));
                bDiv.innerHTML = `<span>✅ Portfolio Linked! Ask me to "Analyze my Zerodha" to see the roast.</span>`;
            }
        } catch (err) { bDiv.innerText = "Zerodha linking failed."; }
    }
});

// --- 10. HARSH VOICE INITIALIZATION ---
window.addEventListener('load', () => {
    if (typeof HarshVoice !== 'undefined') {
        HarshVoice.init('chatContainer');
        if (_sbClient) {
            _sbClient.auth.onAuthStateChange((event) => {
                if (event === 'SIGNED_IN') HarshVoice.loadPreference();
            });
        }
    }
});

// --- 11. SIDEBAR ZERODHA BUTTON ---
if (zerodhaSidebarBtn) {
    zerodhaSidebarBtn.onclick = (e) => {
        e.preventDefault();
        
        // Check both global and local scopes
        const scanFunc = window.startZerodhaScan || (typeof startZerodhaScan === 'function' ? startZerodhaScan : null);
        
        if (scanFunc) {
            scanFunc();
        } else {
            // Friendly fallback if the script is still loading
            appendMessage('bot', "The portfolio module is still warming up. Give it a second and try again! 🚀");
            console.error("Zerodha function not found in window or local scope.");
        }
    };
}

// --- 12. GLOBAL EVENT LISTENERS ---
if (sendBtn) sendBtn.onclick = (e) => handleSend(e);
if (userInput) {
    userInput.onkeydown = (e) => { 
        if (e.key === "Enter" && !e.shiftKey) { 
            e.preventDefault(); 
            handleSend(e); 
        }
    };
}
        
       