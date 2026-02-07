// harsh-gmail.js - THE GMAIL WING
async function triggerHarshInbox() {
    // 1. Get the session from Supabase
    const { data: { session } } = await _sbClient.auth.getSession();
    
    // 2. Extract the Google "Key" (provider_token)
    const googleToken = session?.provider_token;

    if (!googleToken) {
        appendMessage('bot', "Harsh GPT: I don't see the Gmail 'Key'. You need to Log Out and Log In again to grant permission.");
        return;
    }

    const botDiv = appendMessage('bot', "Harsh GPT is sniffing through your emails...");

    try {
        // 3. Fetch latest 3 unread emails from Google API
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
        botDiv.innerText = "Harsh GPT: Google blocked me. Make sure you enabled the Gmail API in Google Cloud!";
    }
}