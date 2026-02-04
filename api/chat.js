module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ reply: "Method not allowed." });
  
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "No message provided!" });

  try {
    // UPDATED: Using the exact model and version your terminal just confirmed
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + 
      process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ reply: `Google Says: ${data.error.message}` });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Connected, but no reply text.";
    res.status(200).json({ reply });

  } catch (error) {
    res.status(500).json({ reply: "Connection failed. Please check Vercel Logs." });
  }
};