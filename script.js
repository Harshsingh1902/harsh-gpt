const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const voiceBtn = document.getElementById("voiceBtn");
const imageInput = document.getElementById("imageInput");

// Add message to UI
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

// Handle sending text
async function handleSend() {
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
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        botDiv.textContent = data.reply;
    } catch (error) {
        botDiv.textContent = "Error connecting to Harsh GPT.";
    }
}

// --- VOICE FEATURE ---
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
voiceBtn.onclick = () => {
    recognition.start();
    voiceBtn.textContent = "🛑"; // Change icon while listening
};

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    voiceBtn.textContent = "🎤";
    handleSend();
};

recognition.onerror = () => { voiceBtn.textContent = "🎤"; };

// --- IMAGE FEATURE ---
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

sendBtn.onclick = handleSend;
userInput.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };