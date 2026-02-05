// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

// Initialize with a check to prevent crashes
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase connected!");
} catch (e) {
    console.error("Supabase failed to load. Check your index.html script tags.", e);
}

// 2. DOM ELEMENTS
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const voiceBtn = document.getElementById("voiceBtn");
const imageInput = document.getElementById("imageInput");
const loginBtn = document.getElementById("loginBtn");
const accountBtn = document.getElementById("accountBtn");

// 3. AUTHENTICATION LOGIC
if (loginBtn) {
    loginBtn.onclick = async () => {
        console.log("Login button clicked");
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) alert("Login Error: " + error.message);
    };
}

if (accountBtn) {
    accountBtn.onclick = async () => {
        await supabase.auth.signOut();
        location.reload();
    };
}

// Track Auth State
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (accountBtn) accountBtn.style.display = 'block';
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (accountBtn) accountBtn.style.display = 'none';
    }
});

// 4. CHAT LOGIC
function addMessage(content, sender, isHTML = false) {
    const div = document.createElement("div");
    div.classList.add("message", sender);
    if (isHTML) div.innerHTML = content;
    else div.textContent = content;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleSend() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        alert("Please login first!");
        return;
    }

    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    userInput.value = "";

    const botDiv = document.createElement("div");
    botDiv.classList.add("message", "bot");
    botDiv.textContent = "Harsh GPT is thinking...";
    chatContainer.appendChild(botDiv);

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, userId: user.id })
        });
        const data = await response.json();
        botDiv.textContent = data.reply || "I couldn't generate a response.";
    } catch (error) {
        botDiv.textContent = "Error connecting to backend.";
    }
}

// 5. EVENT LISTENERS
if (sendBtn) sendBtn.onclick = handleSend;
if (userInput) {
    userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };
}

// Voice Feature
if (voiceBtn) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    voiceBtn.onclick = () => {
        recognition.start();
        voiceBtn.textContent = "🛑";
    };
    recognition.onresult = (event) => {
        userInput.value = event.results[0][0].transcript;
        voiceBtn.textContent = "🎤";
        handleSend();
    };
    recognition.onerror = () => { voiceBtn.textContent = "🎤"; };
}