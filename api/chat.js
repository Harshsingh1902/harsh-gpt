module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Method not allowed. Please use POST." });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ reply: "No message provided!" });
  }

  try {
    // UPDATED URL: Using /v1/ instead of /v1beta/
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ]
        }),
      }
    );

    const data = await response.json();
    
    // Log the full response so we can see any new errors in Vercel
    console.log("FULL GEMINI RESPONSE:", JSON.stringify(data, null, 2));

    // If Gemini still sends an error, we show it clearly now
    if (data.error) {
      return res.status(500).json({ reply: `Gemini Error: ${data.error.message}` });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text 
                  || "I received a response, but it was empty.";

    res.status(200).json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ reply: "Harsh GPT is having trouble connecting." });
  }
};