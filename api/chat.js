export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "No message provided" });
  }

  try {
    // 🔥 NEW fetch with system prompt
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: {
            messages: [
              {
                role: "system",
                content: [
                  { type: "text", text: "You are Harsh GPT, a helpful, friendly AI assistant." }
                ]
              },
              {
                role: "user",
                content: [{ type: "text", text: userMessage }]
              }
            ]
          },
          temperature: 0.7,
          candidate_count: 1
        }),
      }
    );

    const data = await response.json();

    const reply =
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content[0]?.text
        ? data.candidates[0].content[0].text
        : "Gemini responded but had nothing to say 🤔";

    res.status(200).json({ reply });

  } catch (error) {
    res.status(500).json({ reply: "Harsh GPT crashed 😢" });
  }
}