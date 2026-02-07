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

// 2. PREMIUM UI LOGIC
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('sidebar-open');
}

function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    if (window.innerWidth < 480) {
        document.getElementById('sidebar').classList.remove('sidebar-open');
    }
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

// INTEGRATED: Login-aware Home Logic
function goHome() {
    _sbClient.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            chatContainer.innerHTML = `<div class="message bot">Welcome back, ${user.user_metadata.full_name || 'User'}! 👋 Your permanent memory is now active.</div>`;
        } else {
            chatContainer.innerHTML = '<div class="message bot">Hello 👋 I’m Harsh GPT. Please login to enable permanent memory!</div>';
        }
    });
    document.getElementById('sidebar').classList.remove('sidebar-open');
}

function startNewChat() {
    chatContainer.innerHTML = '<div class="message bot">New chat started! How can I help?</div>';
    document.getElementById('sidebar').classList.remove('sidebar-open');
}

// 3. AUTH & HISTORY
if (_sbClient) {
    loginBtn.onclick = async () => {
        await _sbClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
    };

    window.handleLogout = async () => {
        const confirmLogout = confirm("Do you want to logout?");
        if (confirmLogout) {
            await _sbClient.auth.signOut();
            window.location.reload();
        }
    };

    _sbClient.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            loginBtn.style.display = 'none';
            accountBtn.style.display = 'block';
            if (menuBtn) menuBtn.style.display = 'block';
            
            // Update message immediately on state change
            chatContainer.innerHTML = `<div class="message bot">Welcome back, ${session.user.user_metadata.full_name || 'User'}! 👋 Your permanent memory is now active.</div>`;
            
            loadHistory(session.user.id);
        } else {
            loginBtn.style.display = 'block';
            accountBtn.style.display = 'none';
            if (menuBtn) menuBtn.style.display = 'none';
            
            chatContainer.innerHTML = '<div class="message bot">Hello 👋 I’m Harsh GPT. Please login to enable permanent memory!</div>';
        }
    });
}

async function loadHistory(uId) {
    if (!historyList || !_sbClient) return;
    const { data } = await _sbClient
        .from('chats')
        .select('user_message, bot_response')
        .eq('user_id', uId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (data && data.length > 0) {
        historyList.innerHTML = data.map(chat => `
            <div class="history-item" onclick="viewPastChat(\`${chat.user_message.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`, \`${chat.bot_response ? chat.bot_response.replace(/`/g, '\\`').replace(/\$/g, '\\$') : '...'}\`)">
                💬 ${chat.user_message.substring(0, 25)}...
            </div>
        `).join('');
    } else {
        historyList.innerHTML = '<p class="empty-history">No history yet</p>';
    }
}

function viewPastChat(uMsg, bRes) {
    chatContainer.innerHTML = `
        <div class="message user">${uMsg}</div>
        <div class="message bot">${bRes}</div>
    `;
    document.getElementById('sidebar').classList.remove('sidebar-open');
}

// 4. MIC LOGIC
if (voiceBtn) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    
    voiceBtn.onclick = () => {
        voiceBtn.style.background = "transparent"; 
        recognition.start();
        voiceBtn.textContent = "🛑";
    };
    
    recognition.onresult = (e) => {
        userInput.value = e.results[0][0].transcript;
        voiceBtn.textContent = "🎤";
        handleSend();
    };
    
    recognition.onend = () => { 
        voiceBtn.textContent = "🎤"; 
    };
}

// 5. CHAT LOGIC
async function handleSend() {
    const message = userInput.value.trim();
    const imageFile = document.getElementById('imageInput').files[0];
    
    // 1. Validation: Don't send if both are empty
    if (!message && !imageFile) return;

    // 2. Create User Message UI
    const uDiv = document.createElement("div");
    uDiv.className = "message user";
    
    // If there's an image, show it in the chat bubble
    if (imageFile) {
        const imgPreview = document.createElement("img");
        imgPreview.src = URL.createObjectURL(imageFile);
        imgPreview.style.maxWidth = "200px";
        imgPreview.style.borderRadius = "8px";
        imgPreview.style.display = "block";
        imgPreview.style.marginBottom = "8px";
        uDiv.appendChild(imgPreview);
    }
    
    const textSpan = document.createElement("span");
    textSpan.textContent = message || (imageFile ? "Sent an image." : "");
    uDiv.appendChild(textSpan);
    chatContainer.appendChild(uDiv);

    // 3. Clear Inputs & Preview
    userInput.value = "";
    document.getElementById('imageInput').value = "";
    document.getElementById('imagePreviewBox').style.display = "none";

    // 4. Show Bot Thinking
    const bDiv = document.createElement("div");
    bDiv.className = "message bot";
    bDiv.textContent = "Harsh GPT is thinking..."; 
    chatContainer.appendChild(bDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        let uId = "guest";
        let imageUrl = null;

        // 5. Identify User
        if (_sbClient) {
            const { data: { user } } = await _sbClient.auth.getUser();
            if (user) uId = user.id;
        }

        // 6. Handle Image Upload to Supabase
        if (imageFile && _sbClient) {
            const fileName = `${uId}/${Date.now()}-${imageFile.name}`;
            const { data, error } = await _sbClient.storage
                .from('chat-images')
                .upload(fileName, imageFile);

            if (error) throw new Error("Upload failed: " + error.message);

            const { data: { publicUrl } } = _sbClient.storage
                .from('chat-images')
                .getPublicUrl(fileName);
            
            imageUrl = publicUrl;
        }

        // 7. Call API with Message + Image URL
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message || "Analyze this image.", 
                userId: uId,
                imageUrl: imageUrl // This goes to your backend
            })
        });
        
        const data = await res.json();
        bDiv.textContent = data.reply; 
        
        if (uId !== "guest") loadHistory(uId);
        
    } catch (err) {
        console.error(err);
        bDiv.textContent = "Harsh GPT: " + err.message;
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 6. INTEGRATED INITIALIZATION
window.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('harsh-gpt-theme') || 'antariksh';
    const savedFont = localStorage.getItem('harsh-gpt-font') || 'font-default';
    setTheme(savedTheme);
    setFont(savedFont);

    // Ensure correct welcome message on initial load
    if (_sbClient) {
        const { data: { user } } = await _sbClient.auth.getUser();
        if (user) {
            chatContainer.innerHTML = `<div class="message bot">Welcome back, ${user.user_metadata.full_name || 'User'}! 👋 Your permanent memory is now active.</div>`;
        }
    }
});

if (sendBtn) sendBtn.onclick = handleSend;
if (userInput) userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };
