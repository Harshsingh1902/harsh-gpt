export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "No message provided" });
  }

  try {
    // Correct fetch to Gemini API
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
                  {
                    type: "text",
                    text: "You are Harsh GPT, a friendly AI assistant that always replies helpfully."
                  }
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

    // ✅ Correct reading of the reply
    const reply =
      data?.candidates?.[0]?.content?.find(c => c.type === "text")?.text ||
      "Gemini responded but had nothing to say 🤔";

    res.status(200).json({ reply });

  } catch (error) {
    console.error(error); // log error for debugging
    res.status(500).json({ reply: "Harsh GPT crashed 😢" });
  }
}