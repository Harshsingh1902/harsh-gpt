// --- 1. CONFIGURATION & INITIALIZATION ---
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

// Image Preview Elements
const imgInput = document.getElementById('imageInput');
const previewBox = document.getElementById('imagePreviewBox');
const previewImg = document.getElementById('previewImg');
const fileNameSpan = document.getElementById('fileName');
const cancelBtn = document.getElementById('cancelImg');

// --- 2. IMAGE PREVIEW LOGIC (NEW) ---
imgInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            fileNameSpan.textContent = file.name;
            // Force the preview box to show as flex
            previewBox.style.display = 'flex'; 
        };
        reader.readAsDataURL(file);
    }
});

// Cancel Image Selection
if (cancelBtn) {
    cancelBtn.onclick = () => {
        imgInput.value = ""; 
        previewBox.style.display = 'none'; // Hide the preview box
    };
}

// --- 3. PREMIUM UI LOGIC ---
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

// --- 4. AUTH & HISTORY ---
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

// --- 5. MIC LOGIC ---
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

// --- 6. CHAT LOGIC ---
async function handleSend() {
    const message = userInput.value.trim();
    const imageFile = imgInput.files[0];
    
    if (!message && !imageFile) return;

    // UI: Create User Message bubble
    const uDiv = document.createElement("div");
    uDiv.className = "message user";
    
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

    // RESET: Clear input and hide the preview bar
    userInput.value = "";
    imgInput.value = "";
    previewBox.style.display = "none";

    // UI: Bot Thinking
    const bDiv = document.createElement("div");
    bDiv.className = "message bot";
    bDiv.textContent = "Harsh GPT is thinking..."; 
    chatContainer.appendChild(bDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        let uId = "guest";
        let imageUrl = null;

        if (_sbClient) {
            const { data: { user } } = await _sbClient.auth.getUser();
            if (user) uId = user.id;
        }

        // Upload to Supabase Storage
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

        // API Call
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message || "Analyze this image.", 
                userId: uId,
                imageUrl: imageUrl 
            })
        });
        
        const data = await res.json();
        bDiv.textContent = data.reply; 
        
        if (uId !== "guest") loadHistory(uId);
        
    } catch (err) {
        console.error(err);
        bDiv.textContent = "Harsh GPT Error: " + err.message;
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- 7. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('harsh-gpt-theme') || 'antariksh';
    const savedFont = localStorage.getItem('harsh-gpt-font') || 'font-default';
    setTheme(savedTheme);
    setFont(savedFont);

    if (_sbClient) {
        const { data: { user } } = await _sbClient.auth.getUser();
        if (user) {
            chatContainer.innerHTML = `<div class="message bot">Welcome back, ${user.user_metadata.full_name || 'User'}! 👋 Your permanent memory is now active.</div>`;
        }
    }
});

if (sendBtn) sendBtn.onclick = handleSend;
if (userInput) userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };

// --- KILL SWITCH LOGIC ---
async function handleKillSwitch() {
    // 1. Double Confirmation (Prevent accidents)
    const firstCheck = confirm("⚠️ Are you sure? This will PERMANENTLY delete all your chat history from our database.");
    if (!firstCheck) return;

    const secondCheck = confirm("🚀 FINAL WARNING: This action cannot be undone. Everything goes 'Poof'. Proceed?");
    if (!secondCheck) return;

    try {
        // 2. Get the current user
        const { data: { user } } = await _sbClient.auth.getUser();
        
        if (!user) {
            alert("Guest data is not stored permanently. Just refresh the page to clear it!");
            return;
        }

        // 3. Delete from Supabase 'chats' table
        const { error } = await _sbClient
            .from('chats')
            .delete()
            .eq('user_id', user.id); // Deletes only rows belonging to this user

        if (error) throw error;

        // 4. Update UI
        alert("Success! Your digital footprint has been erased. 🔥");
        
        // Clear the chat screen and history list
        chatContainer.innerHTML = '<div class="message bot">History erased. Starting fresh...</div>';
        if (historyList) historyList.innerHTML = '<p class="empty-history">No history yet</p>';
        
        // Close sidebar
        document.getElementById('sidebar').classList.remove('sidebar-open');

    } catch (err) {
        console.error("Kill Switch Error:", err.message);
        alert("Failed to erase data: " + err.message);
    }
}