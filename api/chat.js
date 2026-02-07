const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  console.log("Function triggered with body:", req.body);

  // 1. Destructure the new imageUrl from the request body
  const { message, userId, imageUrl } = req.body;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    let memoryContext = "";

    // 2. Fetch Chat History (Logic remains same)
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

    // 3. Construct Multimodal Content
    // We create a "content" array because Vision models require specific types
    const userContent = [
      { type: "text", text: message || "Analyze this image." }
    ];

    if (imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    }

    // 4. Call Groq with Vision Model
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        // Model switched to Llama 4 Scout for Vision support
        model: "meta-llama/llama-4-scout-17b-16e-instruct", 
        messages: [
          { 
            role: "system", 
            content: `You are Harsh GPT. You are brutally honest, sarcastic, and technical. If an image is provided, roast its quality, content, or the user's choices. Context:\n${memoryContext}` 
          },
          { 
            role: "user", 
            content: userContent 
          }
        ],
        max_tokens: 1024
      })
    });

    const data = await response.json();
    const botReply = data.choices?.[0]?.message?.content || "Harsh GPT: I'm speechless (literally, something went wrong).";

    // 5. Save to Supabase
    if (userId && userId !== "guest") {
      await supabase.from('chats').insert([
        { 
          user_id: userId, 
          user_message: message || "[Sent an image]", 
          bot_response: botReply 
        }
      ]);
    }

    res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error("Crash Error:", error.message);
    res.status(500).json({ reply: "Error: " + error.message });
  }
};