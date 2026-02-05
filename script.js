// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

// Use this specific 'window' check to prevent the "Supabase is not defined" error
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. DOM ELEMENTS
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const loginBtn = document.getElementById("loginBtn");
const accountBtn = document.getElementById("accountBtn");

// 3. AUTH LOGIC (Wrapped in checks to prevent crashing)
if (loginBtn) {
    loginBtn.onclick = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) alert(error.message);
    };
}

// 4. THE SEND BUTTON FIX
async function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;

    // Show your message immediately
    const userDiv = document.createElement("div");
    userDiv.className = "message user";
    userDiv.textContent = message;
    chatContainer.appendChild(userDiv);
    userInput.value = "";

    // Show bot "thinking"
    const botDiv = document.createElement("div");
    botDiv.className = "message bot";
    botDiv.textContent = "Harsh GPT is thinking...";
    chatContainer.appendChild(botDiv);

    try {
        // Check for user (Optional for now to keep chat working even if logged out)
        const { data: { user } } = await supabase.auth.getUser();
        
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message, 
                userId: user ? user.id : "guest" // Fallback to guest so it doesn't break
            })
        });
        const data = await response.json();
        botDiv.textContent = data.reply;
    } catch (e) {
        botDiv.textContent = "Error: Check your Vercel logs.";
    }
}

// Attach the listener
if (sendBtn) sendBtn.onclick = handleSend;