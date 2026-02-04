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

  // This will NOW show up in Vercel Logs because the request will actually succeed
  console.log("FULL GEMINI RESPONSE:", JSON.stringify(data, null, 2));

  // Correct way to extract text from Gemini 1.5
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text 
                || "I heard you, but I couldn't process that. Check logs!";

  res.status(200).json({ reply });

} catch (error) {
  console.error("Fetch Error:", error);
  res.status(500).json({ reply: "Harsh GPT crashed 😢" });
}