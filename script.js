// USING A UNIQUE NAME: _sb
const _sbURL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const _sbKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

// Global Client
const _sbClient = window.supabase ? window.supabase.createClient(_sbURL, _sbKEY) : null;

// DOM Elements
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const voiceBtn = document.getElementById("voiceBtn");
const loginBtn = document.getElementById("loginBtn");
const accountBtn = document.getElementById("accountBtn");

// 1. MIC LOGIC (Simplified)
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

// 2. AUTH LOGIC
if (loginBtn && _sbClient) {
    loginBtn.onclick = async () => {
        await _sbClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
    };
}

if (accountBtn && _sbClient) {
    accountBtn.onclick = async () => {
        await _sbClient.auth.signOut();
        window.location.reload();
    };
}

// Update UI
if (_sbClient) {
    _sbClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            loginBtn.style.display = 'none';
            accountBtn.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            accountBtn.style.display = 'none';
        }
    });
}

// 3. CHAT LOGIC
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
    } catch (err) {
        bDiv.textContent = "Error: Check Vercel.";
    }
}

// Listeners
if (sendBtn) sendBtn.onclick = handleSend;
if (userInput) userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };