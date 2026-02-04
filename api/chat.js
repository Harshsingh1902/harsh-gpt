module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Method not allowed." });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ reply: "No message provided!" });
  }

  try {
    // UPDATED: Using 'gemini-pro' which has the highest compatibility rate
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: message }]
            }
          ]
        }),
      }
    );

    const data = await response.json();
    console.log("FULL GEMINI RESPONSE:", JSON.stringify(data, null, 2));

    if (data.error) {
      return res.status(500).json({ reply: `Gemini Error: ${data.error.message}` });
    }

    // Extraction for gemini-pro structure
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text 
                  || "I'm online, but couldn't generate a text response.";

    res.status(200).json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ reply: "Harsh GPT is having trouble connecting." });
  }
};