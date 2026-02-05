// 1. INITIALIZE SUPABASE
// Note: If using the <script> tag CDN, 'supabase' is globally available on 'window'
const SUPABASE_URL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

// Check if we are in a browser environment with the CDN loaded
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
// Handle Login (Defaulting to Google, change to 'github' if preferred)
loginBtn.onclick = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google', 
        options: {
            redirectTo: window.location.origin // Sends user back to your site after login
        }
    });
    if (error) console.error("Login error:", error.message);
};

// Handle Logout
accountBtn.onclick = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Logout error:", error.message);
    } else {
        location.reload(); // Refresh to clear UI state
    }
};

// Listen for Auth Changes (Login/Logout)
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        // User is logged in
        loginBtn.style.display = 'none';
        accountBtn.style.display = 'block';
        accountBtn.textContent = `Logout (${session.user.email.split('@')[0]})`;
        console.log("Logged in as:", session.user.email);
    } else {
        // User is logged out
        loginBtn.style.display = 'block';
        accountBtn.style.display = 'none';
        chatContainer.innerHTML = '<div class="message bot">Please login to enable permanent memory!</div>';
    }
});

// 4. CHAT LOGIC
function addMessage(content, sender, isHTML = false) {
    const div = document.createElement("div");
    div.classList.add("message", sender);
    if (isHTML) {
        div.innerHTML = content;
    } else {
        div.textContent = content;
    }
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleSend() {
    // Check for user session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        alert("Please login first so I can remember you!");
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
            body: JSON.stringify({ 
                message, 
                userId: user.id 
            })
        });
        const data = await response.json();
        botDiv.textContent = data.reply;
    } catch (error) {
        botDiv.textContent = "Error connecting to Harsh GPT.";
    }
}

// 5. VOICE & IMAGE FEATURES
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

// Event Listeners
sendBtn.onclick = handleSend;
userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };