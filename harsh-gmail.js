// harsh-gmail.js - THE GMAIL WING (Safe Version)
async function triggerHarshInbox() {
    // 1. Close the sidebar menu immediately so the user can see the chat
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('sidebar-open');
    }

    // 2. Get the session from Supabase
    const { data: { session } } = await _sbClient.auth.getSession();
    const googleToken = session?.provider_token;

    // 3. Check if we have the Gmail "Key"
    if (!googleToken) {
        appendMessage('bot', "Harsh GPT: I don't have permission to see your emails yet. Please **Logout** and **Login** again, then check the 'Gmail' box on the Google screen.");
        return;
    }

    const botDiv = appendMessage('bot', "Harsh GPT is sniffing through your emails...");

    try {
        // 4. Fetch latest 3 unread emails
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=3', {
            headers: { 'Authorization': `Bearer ${googleToken}` }
        });
        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
            let report = "### Harsh Inbox Report\n\n";
            for (const msg of data.messages) {
                const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                    headers: { 'Authorization': `Bearer ${googleToken}` }
                });
                const detail = await detailRes.json();
                const subject = detail.payload.headers.find(h => h.name === 'Subject')?.value || "No Subject";
                report += `🔸 **${subject}**\n> ${detail.snippet.substring(0, 60)}...\n\n`;
            }
            botDiv.innerHTML = `<span>${report}**Harsh GPT:** Most of this is junk. Close your inbox and do something useful.</span>`;
        } else {
            botDiv.innerText = "Harsh GPT: Your inbox is clean. I'm actually impressed.";
        }
    } catch (err) {
        botDiv.innerText = "Harsh GPT: Connection failed. Check if Gmail API is enabled in Google Console.";
        console.error("Gmail Error:", err);
    }
}