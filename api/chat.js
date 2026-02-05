const { createClient } = require('@supabase/supabase-js');

// 1. Initialize Supabase
// These must be set in your Vercel Environment Variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Extract user message and identity from the frontend
  const { message, userId } = req.body;

  try {
    let memoryContext = "";

    // 2. FETCH MEMORY: Look up the last 4 exchanges for this user
    if (userId && userId !== "guest") {
      const { data: history, error: fetchError } = await supabase
        .from('chats')
        .select('user_message, bot_response')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(4);

      if (!fetchError && history && history.length > 0) {
        // We reverse them so they are in chronological order (oldest to newest)
        memoryContext = history.reverse()
          .map(h => `User: ${h.user_message}\nAssistant: ${h.bot_response}`)
          .join('\n');
      }
    }

    // 3. GROQ AI CALL: Provide history context so it "remembers"
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: `You are Harsh GPT, a helpful AI. Here is the context of the recent conversation to help you remember the user:\n${memoryContext}` 
          },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    
    // Check for Groq API errors
    if (!data.choices || !data.choices[0]) {
        throw new Error("Invalid response from Groq API");
    }

    const botReply = data.choices[0].message.content;

    // 4. SAVE TO DATABASE: Store this new exchange for next time
    if (userId && userId !== "guest") {
      await supabase.from('chats').insert([
        { 
          user_id: userId, 
          user_message: message, 
          bot_response: botReply 
        }
      ]);
    }

    // Send the reply back to your frontend
    res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ reply: "I'm having trouble accessing my memory. Is the database set up?" });
  }
};