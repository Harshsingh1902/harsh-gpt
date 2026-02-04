module.exports = async (req, res) => {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Method not allowed. Please use POST." });
  }

  // 2. Get the 'message' from your frontend fetch request
  const { message } = req.body;

  // 3. Simple check to ensure text was sent
  if (!message) {
    return res.status(400).json({ reply: "No message provided!" });
  }

  try {
    // 4. Using the STABLE 'v1' URL to fix the 404 "model not found" error
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

    // 5. This log will show you the result in Vercel Dashboard -> Logs
    console.log("FULL GEMINI RESPONSE:", JSON.stringify(data, null, 2));

    // 6. Handle errors or empty responses from Gemini
    if (data.error) {
      return res.status(500).json({ 
        reply: `Gemini Error: ${data.error.message}` 
      });
    }

    // 7. Extract the reply text safely
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text 
                  || "I received a response, but couldn't find the text part.";

    // 8. Send the AI response back to your website
    res.status(200).json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ reply: "Harsh GPT is having trouble connecting to the brain." });
  }
};