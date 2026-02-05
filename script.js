// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://dfatmvkqbccgflrdjhcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXRtdmtxYmNjZ2ZscmRqaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjQ4MzcsImV4cCI6MjA4NTg0MDgzN30.eVycsYQZIxZTBYfkGT_OUipKNAejw0Aurk0FOTJkuK0';

let supabase;

// Wrapping in an Init function to prevent global scope crashes
function initApp() {
    console.log("App starting...");
    try {
        // MUST use window.supabase when using the CDN
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase initialized!");
    } catch (err) {
        console.error("Supabase init failed:", err);
        return;
    }

    const sendBtn = document.getElementById("sendBtn");
    const userInput = document.getElementById("userInput");
    const chatContainer = document.getElementById("chatContainer");
    const loginBtn = document.getElementById("loginBtn");
    const accountBtn = document.getElementById("accountBtn");

    // 2. AUTHENTICATION
    if (loginBtn) {
        loginBtn.onclick = async () => {
            console.log("Login clicked");
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (error) console.error(error);
        };
    }

    if (accountBtn) {
        accountBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.reload();
        };
    }

    // Watch for user login state
    supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth event:", event);
        if (session) {
            loginBtn.style.display = 'none';
            accountBtn.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            accountBtn.style.display = 'none';
        }
    });

    // 3. SEND LOGIC
    async function handleSend() {
        console.log("Send clicked");
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("Please login first!");
            return;
        }

        const message = userInput.value.trim();
        if (!message) return;

        // Add user message to UI
        const userDiv = document.createElement("div");
        userDiv.className = "message user";
        userDiv.textContent = message;
        chatContainer.appendChild(userDiv);
        userInput.value = "";

        // Add temporary bot message
        const botDiv = document.createElement("div");
        botDiv.className = "message bot";
        botDiv.textContent = "Harsh GPT is thinking...";
        chatContainer.appendChild(botDiv);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, userId: user.id })
            });
            const data = await response.json();
            botDiv.textContent = data.reply;
        } catch (error) {
            botDiv.textContent = "Error: Backend not reachable.";
            console.error(error);
        }
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    if (sendBtn) sendBtn.onclick = handleSend;
    if (userInput) {
        userInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSend();
        });
    }
}

// Start everything
window.onload = initApp;