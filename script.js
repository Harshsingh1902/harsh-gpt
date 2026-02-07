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

// --- 5. CHAT LOGIC ---
async function handleSend() {
    const message = userInput.value.trim();
    const imageFile = imgInput ? imgInput.files[0] : null;
    
    if (!message && !imageFile) return;

    // 1. User Message (Displays image immediately)
    appendMessage('user', message, imageFile);
    
    // Reset inputs
    userInput.value = "";
    if (imgInput) imgInput.value = "";
    if (previewBox) previewBox.style.display = "none";

    // 2. Bot Thinking
    const bDiv = appendMessage('bot', "Harsh GPT is thinking...");

    try {
        let uId = "guest";
        let imageUrl = null;
        if (_sbClient) {
            const { data: { user } } = await _sbClient.auth.getUser();
            if (user) uId = user.id;
        }

        // Image Upload Logic
        if (imageFile && _sbClient && uId !== "guest") {
            const fileName = `${uId}/${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await _sbClient.storage.from('chat-images').upload(fileName, imageFile);
            if (!uploadError) {
                const { data: { publicUrl } } = _sbClient.storage.from('chat-images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }
        }

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message || "Analyze this image.", userId: uId, imageUrl: imageUrl })
        });
        
        const data = await res.json();
        
        // 3. Update Bot Thinking Div with real content
        if (data.reply) {
            bDiv.innerHTML = `<span>${data.reply}</span>`;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '📋';
            copyBtn.onclick = function() { window.copyToClipboard(data.reply, this); };
            bDiv.appendChild(copyBtn);
        } else {
            bDiv.innerText = "Harsh GPT: I'm speechless (API Error).";
        }
        
        if (uId !== "guest") loadHistory(uId);

    } catch (err) {
        if (bDiv) bDiv.innerText = "Harsh GPT: I'm speechless (literally, something went wrong).";
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

// --- 7. AUTH & HISTORY (Unified Greeting Fix) ---
if (_sbClient) {
    loginBtn.onclick = async () => { 
        await _sbClient.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { redirectTo: window.location.origin } 
        }); 
    };

    window.handleLogout = async () => { 
        if (confirm("Do you want to logout?")) { 
            await _sbClient.auth.signOut(); 
            window.location.reload(); 
        } 
    };

    _sbClient.auth.onAuthStateChange(async (event, session) => {
        // Clear container to prevent double messages during login/logout
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
    });
}

async function loadHistory(uId) {
    if (!historyList || !_sbClient) return;
    const { data } = await _sbClient.from('chats').select('*').eq('user_id', uId).order('created_at', { ascending: false }).limit(10);

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
    document.getElementById('sidebar').classList.remove('sidebar-open');
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

// --- 9. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    window.setTheme(localStorage.getItem('harsh-gpt-theme') || 'antariksh');
    window.setFont(localStorage.getItem('harsh-gpt-font') || 'font-default');
    // Note: Greeting is now handled strictly by onAuthStateChange to prevent duplicates
});

if (sendBtn) sendBtn.onclick = handleSend;
if (userInput) userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };