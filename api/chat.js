// This uses CommonJS (module.exports) which works even without a package.json
module.exports = async (req, res) => {
  // 1. Only allow POST requests from your chat UI
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Method not allowed. Please use POST." });
  }

  const { userMessage } = req.body;

  // 2. Basic validation to make sure there is a message
  if (!userMessage) {
    return res.status(400).json({ reply: "No message provided!" });
  }

  try {
    // 3. Fetch data from Gemini API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: userMessage }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            candidateCount: 1
          }
        }),
      }
    );

    const data = await response.json();
    
    // 4. LOGGING: This is what you will look for in Vercel Logs
    console.log("FULL GEMINI RESPONSE:", JSON.stringify(data, null, 2));

    // 5. Extract the text reply from the Gemini JSON structure
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text 
                  || "I received a response, but couldn't find the text part.";

    // 6. Send the successful response back to your frontend
    res.status(200).json({ reply });

  } catch (error) {
    // 7. Error handling
    console.error("Server Error:", error);
    res.status(500).json({ reply: "Harsh GPT is having trouble connecting to the brain." });
  }
};