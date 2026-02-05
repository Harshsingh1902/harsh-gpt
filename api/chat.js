module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ reply: "Method not allowed." });
  
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "No message provided!" });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ reply: `Groq Error: ${data.error.message}` });
    }

    // Extracting the text specifically for the Groq/OpenAI format
    const reply = data.choices?.[0]?.message?.content || "No response from Groq.";
    res.status(200).json({ reply });

  } catch (error) {
    res.status(500).json({ reply: "Connection to Groq failed." });
  }
};