module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: "Method not allowed. Please use POST." });
  }

  // We are taking 'message' from the frontend
  const { message } = req.body; 

  // FIX 1: Use 'message' here
  if (!message) { 
    return res.status(400).json({ reply: "No message provided!" });
  }

  try {
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
              // FIX 2: Use 'message' here
              parts: [{ text: message }] 
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
    console.log("FULL GEMINI RESPONSE:", JSON.stringify(data, null, 2));

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text 
                  || "I received a response, but couldn't find the text part.";

    res.status(200).json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ reply: "Harsh GPT is having trouble connecting." });
  }
};