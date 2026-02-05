const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Add a log to see if the function even starts
  console.log("Function triggered with body:", req.body);

  const { message, userId } = req.body;

  // Initialize Supabase inside the handler to ensure env vars are fresh
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    let memoryContext = "";

    if (userId && userId !== "guest") {
      const { data: history, error: fetchError } = await supabase
        .from('chats')
        .select('user_message, bot_response')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(4);

      if (fetchError) console.error("Supabase Fetch Error:", fetchError);

      if (history && history.length > 0) {
        memoryContext = history.reverse()
          .map(h => `User: ${h.user_message}\nAssistant: ${h.bot_response}`)
          .join('\n');
      }
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `You are Harsh GPT. Context:\n${memoryContext}` },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    const botReply = data.choices?.[0]?.message?.content || "No response from AI.";

    if (userId && userId !== "guest") {
      await supabase.from('chats').insert([
        { user_id: userId, user_message: message, bot_response: botReply }
      ]);
    }

    res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error("Crash Error:", error.message);
    res.status(500).json({ reply: "Error: " + error.message });
  }
};