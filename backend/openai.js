import axios from "axios";

// ⏱ delay helper
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// 🔁 retry logic for 429
const fetchWithRetry = async (apiUrl, headers, data, retries = 3) => {
  try {
    return await axios.post(apiUrl, data, { headers });
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      console.log("⚠️ Too many requests... retrying in 2 sec");
      await delay(2000);
      return fetchWithRetry(apiUrl, headers, data, retries - 1);
    }

    throw error;
  }
};

const openaiResponse = async (command, assistantName, userName) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OpenAI API key missing in .env");
    }

    const apiUrl = "https://api.openai.com/v1/chat/completions";

    const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}. 
You are not Google. You will now behave like a voice-enabled assistant.

Your task is to understand the user's natural language input and respond with a JSON object like this:

{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month"|"calculator-open" | "instagram-open" |"facebook-open" |"weather-show" | "open-website",
  "userInput": "<original user input>",
  "response": "<short spoken reply>",
  "websiteUrl": "<full https URL of the website if type is open-website, else omit>"
}

Important:
- Remove assistant name if present
- Only JSON output`;

    console.log("📡 Sending request:", command);

    const result = await fetchWithRetry(
      apiUrl,
      {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      {
        model: "gpt-5.4-nano",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: command }
        ],
        temperature: 0.7
      }
    );

    const output = result.data?.choices?.[0]?.message?.content;

    if (!output) {
      throw new Error("Invalid response from OpenAI");
    }

    // 🧾 safe JSON parse
    try {
      return JSON.parse(output);
    } catch (err) {
      console.log("⚠️ JSON parse failed:", output);

      return {
        type: "general",
        userInput: command,
        response: "Sorry, I didn't understand that"
      };
    }

  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message);

    return {
      type: "general",
      userInput: command,
      response: "Server busy, please try again"
    };
  }
};

export default openaiResponse;