// --- 1. CONFIGURATION & INITIALIZATION ---
const _sbURL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const _sbKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';
const _sbClient = window.supabase ? window.supabase.createClient(_sbURL, _sbKEY) : null;

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

// --- 5. CHAT LOGIC (Fixed & Debugged) ---
async function handleSend() {
    const message = userInput.value.trim();
    const imageFile = imgInput ? imgInput.files[0] : null;
    
    // Safety check
    if (!message && !imageFile) return;

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
            const { data: { user } } = await _sbClient.auth.getUser();
            if (user) uId = user.id;
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
        // IMPORTANT: Ensure your backend is running at this URL
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message || "Analyze this image.", 
                userId: uId, 
                imageUrl: imageUrl 
            })
        });
        
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        
        const data = await res.json();
        
        // 5. Finalize Bot Response
        if (data && data.reply) {
            bDiv.innerHTML = `<span>${data.reply}</span>`;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '📋';
            copyBtn.onclick = function() { window.copyToClipboard(data.reply, this); };
            bDiv.appendChild(copyBtn);
        } else {
            bDiv.innerText = "Harsh GPT: I'm speechless (Empty response from brain).";
        }
        
        if (uId !== "guest") loadHistory(uId);

    } catch (err) {
        console.error("DETAILED CHAT ERROR:", err);
        if (bDiv) {
            bDiv.innerText = `Harsh GPT: I'm speechless. (Error: ${err.message})`;
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
// --- 7. AUTH, HISTORY & NAVIGATION ---
if (_sbClient) {
    // Logic for Google Login
    loginBtn.onclick = async (e) => { 
        e.preventDefault();
        const { error } = await _sbClient.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { 
                scopes: 'https://www.googleapis.com/auth/gmail.readonly', 
                queryParams: {
                    access_type: 'offline',
                    prompt: 'select_account consent'
                },
                redirectTo: window.location.origin 
            } 
        }); 
        if (error) console.error("Login Error:", error.message);
    };

    // ... (rest of your logout and navigation logic stays exactly the same)

    // Logic for Logout
    window.handleLogout = async () => { 
        if (confirm("Do you want to logout?")) { 
            await _sbClient.auth.signOut(); 
            window.location.reload(); 
        } 
    };

    // NAVIGATION FUNCTIONS
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

    window.goHome = () => {
        window.location.reload();
    };

    // MONITOR AUTH STATE (Fixes Permanent Memory Message)
    _sbClient.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth Event:", event);
        
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
            chatContainer.innerHTML = ''; // Wipes the "Guest" greeting immediately

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

// FETCH HISTORY
async function loadHistory(uId) {
    if (!historyList || !_sbClient) return;
    const { data, error } = await _sbClient
        .from('chats')
        .select('*')
        .eq('user_id', uId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("History Error:", error.message);
        return;
    }

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

// VIEW PAST CHAT
window.viewPastChat = (uMsg, bRes) => {
    chatContainer.innerHTML = '';
    appendMessage('user', uMsg);
    appendMessage('bot', bRes);
    if (document.getElementById('sidebar')) document.getElementById('sidebar').classList.remove('sidebar-open');
};

// --- 8. CHAT LOGIC (Integrated History Saving) ---
async function handleSend(e) {
    if (e) e.preventDefault(); 

    const message = userInput.value.trim();
    const imageFile = imgInput ? imgInput.files[0] : null;
    
    if (!message && !imageFile) return;

    appendMessage('user', message, imageFile);
    
    userInput.value = "";
    if (imgInput) imgInput.value = "";
    if (previewBox) previewBox.style.display = "none";

    const bDiv = appendMessage('bot', "Harsh GPT is thinking...");

    try {
        let uId = "guest";
        let imageUrl = null;

        const { data: { session } } = await _sbClient.auth.getSession();
        if (session) uId = session.user.id;

        if (imageFile && uId !== "guest") {
            const fileName = `${uId}/${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await _sbClient.storage.from('chat-images').upload(fileName, imageFile);
            if (!uploadError) {
                imageUrl = _sbClient.storage.from('chat-images').getPublicUrl(fileName).data.publicUrl;
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased to 45s for stability

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message || "Analyze image", userId: uId, imageUrl }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await res.json();
        
        if (data.reply) {
            bDiv.innerHTML = `<span>${data.reply}</span>`;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn'; copyBtn.innerHTML = '📋';
            copyBtn.onclick = () => window.copyToClipboard(data.reply, copyBtn);
            bDiv.appendChild(copyBtn);
            
            // CRITICAL: Refresh history so the new chat shows up in sidebar
            if (uId !== "guest") loadHistory(uId);
        } else {
            bDiv.innerText = "Harsh GPT: API returned no response.";
        }

    } catch (err) {
        console.error("Full Error:", err);
        bDiv.innerText = `Harsh GPT: Error - ${err.name === 'AbortError' ? 'Request timed out' : err.message}`;
    }
}

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

// --- 9. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Set UI Preferences (Theme & Font)
    const savedTheme = localStorage.getItem('harsh-gpt-theme') || 'antariksh';
    const savedFont = localStorage.getItem('harsh-gpt-font') || 'font-default';
    
    if (window.setTheme) window.setTheme(savedTheme);
    if (window.setFont) window.setFont(savedFont);

    // 2. The Login Fix: Manually capture the session on page load
    if (_sbClient) {
        try {
            // This is the "magic" line that reads the Google login token from the URL
            const { data: { session }, error } = await _sbClient.auth.getSession();
            
            if (session) {
                console.log("Session detected for:", session.user.email);
                
                // Force UI to logged-in state
                if (loginBtn) loginBtn.style.display = 'none';
                if (accountBtn) accountBtn.style.display = 'block';
                if (menuBtn) menuBtn.style.display = 'block';
                
                // Prevent double greetings: only greet if chat is empty
                if (chatContainer && chatContainer.innerHTML.trim() === "") {
                    appendMessage('bot', `Welcome back, ${session.user.user_metadata.full_name || 'User'}! 👋`);
                    if (typeof loadHistory === 'function') loadHistory(session.user.id);
                }
            } else {
                console.log("No session found - Guest Mode.");
                if (chatContainer && chatContainer.innerHTML.trim() === "") {
                    appendMessage('bot', "Hello 👋 I’m Harsh GPT. Please login to enable permanent memory!");
                }
            }
        } catch (err) {
            console.error("Initialization Auth Error:", err);
        }
    }
});

// --- GLOBAL EVENT LISTENERS ---

// 1. Click Listener
if (sendBtn) {
    sendBtn.onclick = (e) => {
        handleSend(e);
    };
}

// 2. Keyboard Listener (Enter Key)
if (userInput) {
    userInput.onkeydown = (e) => { 
        if (e.key === "Enter" && !e.shiftKey) { 
            e.preventDefault(); // CRITICAL: Stops page refresh/signal abortion
            handleSend(e); 
        }
    };
}