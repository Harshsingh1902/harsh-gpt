// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

// Use 'window.supabase' to ensure the CDN is recognized
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. DOM ELEMENTS
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const voiceBtn = document.getElementById("voiceBtn");
const imageInput = document.getElementById("imageInput");
const loginBtn = document.getElementById("loginBtn");
const accountBtn = document.getElementById("accountBtn");

// 3. AUTHENTICATION LOGIC
// Handle Login
loginBtn.onclick = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) alert("Login Error: " + error.message);
};

// Handle Logout
accountBtn.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
};

// Update UI based on User State
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        loginBtn.style.display = 'none';
        accountBtn.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        accountBtn.style.display = 'none';
    }
});

// 4. THE CORE CHAT LOGIC (Restored)
function addMessage(content, sender, isHTML = false) {
    const div = document.createElement("div");
    div.classList.add("message", sender);
    if (isHTML) div.innerHTML = content;
    else div.textContent = content;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;

    // 1. Show User Message
    addMessage(message, "user");
    userInput.value = "";

    // 2. Show Bot Thinking
    const botDiv = document.createElement("div");
    botDiv.classList.add("message", "bot");
    botDiv.textContent = "Harsh GPT is thinking...";
    chatContainer.appendChild(botDiv);

    try {
        // Get user session to pass to backend for memory
        const { data: { user } } = await supabase.auth.getUser();
        
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message, 
                userId: user ? user.id : "guest" 
            })
        });
        const data = await response.json();
        botDiv.textContent = data.reply;
    } catch (error) {
        botDiv.textContent = "Error: Backend unreachable.";
    }
}

// 5. VOICE & IMAGE FEATURES (Restored)
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

imageInput.onchange = () => {
    const file = imageInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgHTML = `<img src="${e.target.result}" style="width:100%; border-radius:10px;">`;
            addMessage(imgHTML, "user", true);
        };
        reader.readAsDataURL(file);
    }
};

// Event Listeners for Buttons
sendBtn.onclick = handleSend;
userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };