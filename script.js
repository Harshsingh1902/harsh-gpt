// 1. CONFIGURATION & INITIALIZATION
const _sbURL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const _sbKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';
const _sbClient = window.supabase ? window.supabase.createClient(_sbURL, _sbKEY) : null;

// DOM Elements
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const voiceBtn = document.getElementById("voiceBtn");
const loginBtn = document.getElementById("loginBtn");
const accountBtn = document.getElementById("accountBtn");
const menuBtn = document.getElementById("menuBtn");
const historyList = document.getElementById("chat-history-list");

// 2. PREMIUM UI LOGIC (Sidebar, Themes, Fonts)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('sidebar-open');
}

function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    if (window.innerWidth < 480) toggleSidebar(); // Close sidebar on mobile
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('harsh-gpt-theme', theme);
}

function setFont(fontClass) {
    document.body.className = fontClass;
    localStorage.setItem('harsh-gpt-font', fontClass);
}

function startNewChat() {
    chatContainer.innerHTML = '<div class="message bot">New chat started! How can I help?</div>';
    toggleSidebar();
}

// 3. AUTH & HISTORY INTEGRATION
if (_sbClient) {
    // Google Login
    loginBtn.onclick = async () => {
        await _sbClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
    };

    // Logout Function
    window.handleLogout = async () => {
        await _sbClient.auth.signOut();
        window.location.reload();
    };

    // Update UI & Load History on Auth Change
    _sbClient.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            loginBtn.style.display = 'none';
            accountBtn.style.display = 'block';
            if (menuBtn) menuBtn.style.display = 'block';
            loadHistory(session.user.id);
        } else {
            loginBtn.style.display = 'block';
            accountBtn.style.display = 'none';
            if (menuBtn) menuBtn.style.display = 'none';
        }
    });
}

// Fetch history from Supabase for the sidebar
async function loadHistory(uId) {
    if (!historyList) return;
    const { data } = await _sbClient
        .from('chats')
        .select('user_message')
        .eq('user_id', uId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (data && data.length > 0) {
        historyList.innerHTML = data.map(chat => `
            <div class="history-item" onclick="toggleSidebar()">
                💬 ${chat.user_message.substring(0, 20)}...
            </div>
        `).join('');
    }
}

// 4. MIC LOGIC
if (voiceBtn) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    voiceBtn.onclick = () => {
        recognition.start();
        voiceBtn.textContent = "🛑";
    };
    recognition.onresult = (e) => {
        userInput.value = e.results[0][0].transcript;
        voiceBtn.textContent = "🎤";
        handleSend();
    };
    recognition.onend = () => { voiceBtn.textContent = "🎤"; };
}

// 5. CHAT LOGIC (API CALL)
async function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;

    // Add User Message
    const uDiv = document.createElement("div");
    uDiv.className = "message user";
    uDiv.textContent = message;
    chatContainer.appendChild(uDiv);
    userInput.value = "";

    // Add Bot Placeholder
    const bDiv = document.createElement("div");
    bDiv.className = "message bot";
    bDiv.textContent = "Harsh GPT is thinking...";
    chatContainer.appendChild(bDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        let uId = "guest";
        if (_sbClient) {
            const { data } = await _sbClient.auth.getUser();
            if (data?.user) uId = data.user.id;
        }

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, userId: uId })
        });
        const data = await res.json();
        bDiv.textContent = data.reply;
        
        // Refresh sidebar history after sending
        if (uId !== "guest") loadHistory(uId);
        
    } catch (err) {
        bDiv.textContent = "Error: Check Vercel Logs.";
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 6. INITIALIZATION & LISTENERS
window.addEventListener('DOMContentLoaded', () => {
    // Load saved preferences
    const savedTheme = localStorage.getItem('harsh-gpt-theme') || 'antariksh';
    const savedFont = localStorage.getItem('harsh-gpt-font') || 'font-default';
    setTheme(savedTheme);
    setFont(savedFont);
});

if (sendBtn) sendBtn.onclick = handleSend;
if (userInput) userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };