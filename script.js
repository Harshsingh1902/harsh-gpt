const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");

function addMessage(text, sender) {
    const div = document.createElement("div");
    div.classList.add("message", sender);
    div.textContent = text;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    userInput.value = "";

    // --- NEW LOADING STATE ---
    const botDiv = document.createElement("div");
    botDiv.classList.add("message", "bot", "typing"); // Added 'typing' class for CSS dots
    botDiv.innerHTML = "<span></span><span></span><span></span>"; // Creates the 3 animated dots
    chatContainer.appendChild(botDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        
        // --- REPLACE DOTS WITH TEXT ---
        botDiv.classList.remove("typing"); // Removes the dots styling
        botDiv.textContent = data.reply; // Sets the actual AI response

    } catch (error) {
        botDiv.classList.remove("typing");
        botDiv.textContent = "Error connecting to Harsh GPT";
    }
}

sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
});