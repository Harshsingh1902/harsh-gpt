const { createClient } = require('@supabase/supabase-js');

// This line is CRUCIAL: It fixes the "fetch is not defined" error in Vercel's Node environment
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 1. Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  const { message, userId } = req.body;

  try {
    let memoryContext = "";

    // 2. FETCH MEMORY
    if (userId && userId !== "guest") {
      const { data: history, error: fetchError } = await supabase
        .from('chats')
        .select('user_message, bot_response')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(4);

      if (!fetchError && history && history.length > 0) {
        memoryContext = history.reverse()
          .map(h => `User: ${h.user_message}\nAssistant: ${h.bot_response}`)
          .join('\n');
      }
    }

    // 3. GROQ AI CALL
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
            content: `You are Harsh GPT, a helpful AI. Context:\n${memoryContext}` 
          },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
        throw new Error("Invalid response from Groq API: " + JSON.stringify(data));
    }

    const botReply = data.choices[0].message.content;

    // 4. SAVE TO DATABASE
    if (userId && userId !== "guest") {
      await supabase.from('chats').insert([
        { 
          user_id: userId, 
          user_message: message, 
          bot_response: botReply 
        }
      ]);
    }

    res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ reply: "Error: " + error.message });
  }
};