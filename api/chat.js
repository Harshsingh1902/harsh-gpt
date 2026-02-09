// api/chat.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  console.log("Function triggered with body:", req.body);

  // 1. Destructure all fields including portfolioData from Zerodha
  const { message, userId, imageUrl, portfolioData } = req.body;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    let memoryContext = "";

    // 2. Fetch Chat History (Memory)
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

    // 3. Financial Context (Zerodha Logic)
    let financialContext = "";
    if (portfolioData && portfolioData.holdings && portfolioData.holdings.length > 0) {
      const holdingsSummary = portfolioData.holdings.map(h => 
        `${h.tradingsymbol}: ${h.quantity} shares (Avg: ${h.average_price})`
      ).join(", ");
      
      const cash = portfolioData.margins?.equity?.available?.cash || "0";
      
      financialContext = `\n[FINANCIAL DATA DETECTED]: 
      The user is holding: ${holdingsSummary}. 
      Cash: ₹${cash}. 
      Use this to insult their poor investment choices specifically.`;
    }

    // 4. Construct Content for Vision Model
    const userContent = [
      { type: "text", text: message || "Analyze this." }
    ];

    if (imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    }

    // 5. Unified "Harsh" System Prompt
    const systemPrompt = `You are Harsh GPT. You are brutally honest, sarcastic, and a financial elitist. 
    Roast the user's chat, their images, and especially their portfolio if provided.
    
    Previous Context:
    ${memoryContext}
    
    ${financialContext}`;

    // 6. Call Groq with Vision Support
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        max_tokens: 1024,
        temperature: 0.8
      })
    });

    const data = await response.json();
    const botReply = data.choices?.[0]?.message?.content || "Harsh GPT: I'm too busy laughing at your bank balance to answer.";

    // 7. Save to Supabase (Record the interaction)
    if (userId && userId !== "guest") {
      await supabase.from('chats').insert([
        { 
          user_id: userId, 
          user_message: message || (imageUrl ? "[Image Sent]" : "[Financial Scan]"), 
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