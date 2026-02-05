// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

// We wrap initialization in a check to make sure the library is loaded
let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase is ready!");
} else {
    console.error("Supabase CDN not found! Check your index.html script tags.");
}

// 2. DOM ELEMENTS
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const voiceBtn = document.getElementById("voiceBtn");
const imageInput = document.getElementById("imageInput");
const loginBtn = document.getElementById("loginBtn");
const accountBtn = document.getElementById("accountBtn");

// 3. VOICE LOGIC (MIC 🎤)
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.continuous = false;

voiceBtn.onclick = () => {
    try {
        recognition.start();
        voiceBtn.textContent = "🛑"; // Change mic to stop icon
        console.log("Mic is listening...");
    } catch (e) {
        console.error("Mic error:", e);
    }
};

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    voiceBtn.textContent = "🎤"; // Reset to mic icon
    handleSend(); // Auto-send after speaking
};

recognition.onerror = () => {
    voiceBtn.textContent = "🎤";
    console.log("Mic stopped or error occurred.");
};

recognition.onend = () => {
    voiceBtn.textContent = "🎤";
};

// 4. AUTHENTICATION (GOOGLE LOGIN)
if (loginBtn) {
    loginBtn.onclick = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) console.error("Login Error:", error.message);
    };
}

if (accountBtn) {
    accountBtn.onclick = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };
}

// Update UI when logged in
if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            loginBtn.style.display = 'none';
            accountBtn.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            accountBtn.style.display = 'none';
        }
    });
}

// 5. CHAT LOGIC (SENDING MESSAGES)
function addMessage(content, sender) {
    const div = document.createElement("div");
    div.classList.add("message", sender);
    div.textContent = content;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;

    // Show your message
    addMessage(message, "user");
    userInput.value = "";

    // Show bot thinking
    const botDiv = document.createElement("div");
    botDiv.classList.add("message", "bot");
    botDiv.textContent = "Harsh GPT is thinking...";
    chatContainer.appendChild(botDiv);

    try {
        // Check if user is logged in
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
        botDiv.textContent = data.reply || "I'm having trouble thinking right now.";
    } catch (error) {
        botDiv.textContent = "Error: Check your Vercel logs.";
        console.error("Fetch error:", error);
    }
}

// 6. EVENT LISTENERS
sendBtn.onclick = handleSend;
userInput.onkeydown = (e) => { 
    if (e.key === "Enter") handleSend(); 
};