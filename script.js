// 1. SAFE INITIALIZATION
const SUPABASE_URL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

let supabase;

// This function runs ONLY after the page is fully loaded
window.onload = () => {
    console.log("Page loaded, initializing features...");

    // Initialize Supabase safely
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase Ready");
            setupAuth();
        }
    } catch (e) {
        console.error("Supabase load error:", e);
    }

    setupChat();
    setupVoice();
};

// 2. AUTHENTICATION (Login/Logout)
function setupAuth() {
    const loginBtn = document.getElementById("loginBtn");
    const accountBtn = document.getElementById("accountBtn");

    if (loginBtn) {
        loginBtn.onclick = async () => {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
        };
    }

    if (accountBtn) {
        accountBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.reload();
        };
    }

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

// 3. VOICE LOGIC (MIC 🎤)
function setupVoice() {
    const voiceBtn = document.getElementById("voiceBtn");
    const userInput = document.getElementById("userInput");

    if (!voiceBtn) return;

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    
    voiceBtn.onclick = () => {
        try {
            recognition.start();
            voiceBtn.textContent = "🛑";
        } catch (e) {
            recognition.stop();
            voiceBtn.textContent = "🎤";
        }
    };

    recognition.onresult = (event) => {
        userInput.value = event.results[0][0].transcript;
        voiceBtn.textContent = "🎤";
        handleSend(); 
    };

    recognition.onend = () => { voiceBtn.textContent = "🎤"; };
}

// 4. CHAT LOGIC
function setupChat() {
    const sendBtn = document.getElementById("sendBtn");
    const userInput = document.getElementById("userInput");

    if (sendBtn) sendBtn.onclick = handleSend;
    if (userInput) {
        userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };
    }
}

async function handleSend() {
    const userInput = document.getElementById("userInput");
    const chatContainer = document.getElementById("chatContainer");
    const message = userInput.value.trim();

    if (!message) return;

    // UI: Add User Message
    const userDiv = document.createElement("div");
    userDiv.className = "message user";
    userDiv.textContent = message;
    chatContainer.appendChild(userDiv);
    userInput.value = "";

    // UI: Add Bot Thinking
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