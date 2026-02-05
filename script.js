// 1. DECLARE ONCE AND ONLY ONCE
const SUPABASE_URL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

// Check if window.supabase exists from the CDN, then create the client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (supabase) {
    console.log("Supabase initialized successfully!");
} else {
    console.error("Supabase library not found. Check your HTML script tags.");
}

// 2. DOM ELEMENTS
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const voiceBtn = document.getElementById("voiceBtn");
const loginBtn = document.getElementById("loginBtn");
const accountBtn = document.getElementById("accountBtn");

// 3. VOICE LOGIC (MIC 🎤)
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';

if (voiceBtn) {
    voiceBtn.onclick = () => {
        try {
            recognition.start();
            voiceBtn.textContent = "🛑";
        } catch (e) {
            recognition.stop();
            voiceBtn.textContent = "🎤";
        }
    };
}

recognition.onresult = (event) => {
    userInput.value = event.results[0][0].transcript;
    voiceBtn.textContent = "🎤";
    handleSend(); 
};

recognition.onend = () => { voiceBtn.textContent = "🎤"; };

// 4. AUTH LOGIC
if (loginBtn && supabase) {
    loginBtn.onclick = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
    };
}

if (accountBtn && supabase) {
    accountBtn.onclick = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };
}

if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (accountBtn) accountBtn.style.display = 'block';
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (accountBtn) accountBtn.style.display = 'none';
        }
    });
}

// 5. CHAT LOGIC
async function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;

    // Add User Message
    const userDiv = document.createElement("div");
    userDiv.className = "message user";
    userDiv.textContent = message;
    chatContainer.appendChild(userDiv);
    userInput.value = "";

    // Add Bot Thinking
    const botDiv = document.createElement("div");
    botDiv.className = "message bot";
    botDiv.textContent = "Harsh GPT is thinking...";
    chatContainer.appendChild(botDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        let userId = "guest";
        if (supabase) {
            const { data } = await supabase.auth.getUser();
            if (data?.user) userId = data.user.id;
        }

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, userId })
        });
        const data = await response.json();
        botDiv.textContent = data.reply;
    } catch (error) {
        botDiv.textContent = "Error: Check backend.";
    }
}

// Attach Event Listeners
if (sendBtn) sendBtn.onclick = handleSend;
if (userInput) {
    userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };
}