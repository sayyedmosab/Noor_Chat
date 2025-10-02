/**
 * A standalone agent for interacting with the Google Gemini API.
 * This script is decoupled from any UI and can be used in Node.js or other JavaScript environments.
 * It exposes functions to generate code and simulate function calls.
 */

/**
 * Core function to make a POST request to the Gemini API.
 * Includes exponential backoff for handling rate limits.
 *
 * @param {object} payload - The request payload to send to the Gemini API.
 * @param {string} apiKey - Your Google Gemini API key.
 * @returns {Promise<string>} A promise that resolves with the text response or function call JSON from the model.
 * @throws {Error} Throws an error if the API key is missing or the request fails after all retries.
 */
async function callGeminiAPI(payload, apiKey) {
    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please provide a valid API key.");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const maxRetries = 3;
    let delay = 1000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                const candidate = result.candidates?.[0];

                // Handle function call responses
                if (payload.tools) {
                    const functionCall = candidate?.content?.parts?.[0]?.functionCall;
                    if (functionCall) {
                        return JSON.stringify(functionCall, null, 2);
                    }
                    const textResponse = candidate?.content?.parts?.[0]?.text;
                    if(textResponse){
                         return `Model did not suggest a function call. Response:\n\n${textResponse}`;
                    }
                    return "No function call or text response found.";
                }

                // Handle standard text generation responses
                const text = candidate?.content?.parts?.[0]?.text;
                if (text) {
                    // Clean up markdown code blocks if present
                    return text.replace(/```javascript|```/g, '').trim();
                } else {
                    return "No text content was generated.";
                }
            }

            // Retry on rate limit or server errors
            if (response.status === 429 || response.status >= 500) {
                console.log(`Attempt ${i + 1} failed with status ${response.status}. Retrying in ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff
            } else {
                // For other client-side errors, fail immediately
                throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
            }

        } catch (error) {
            console.error(`An error occurred during API call attempt ${i + 1}:`, error);
            if (i === maxRetries - 1) { // If it's the last retry, re-throw the error
                throw error;
            }
        }
    }

    throw new Error("API request failed after all retries.");
}

/**
 * An agent task to generate JavaScript code.
 *
 * @param {string} userPrompt - A description of the code to generate.
 * @param {string} apiKey - Your Google Gemini API key.
 * @returns {Promise<string>} A promise that resolves with the generated JavaScript code as a string.
 */
export async function generateCode(userPrompt, apiKey) {
    console.log(`Agent: Generating code for prompt: "${userPrompt}"`);
    const systemPrompt = "You are an expert JavaScript developer. Generate only the JavaScript code for the following request, without any markdown formatting or explanation.";
    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    return callGeminiAPI(payload, apiKey);
}

/**
 * An agent task to simulate a function call.
 *
 * @param {string} userPrompt - A natural language command that should trigger a function call.
 * @param {string} apiKey - Your Google Gemini API key.
 * @returns {Promise<string>} A promise that resolves with the suggested function call as a JSON string.
 */
export async function simulateFunctionCall(userPrompt, apiKey, toolsPayload) {
    console.log(`Agent: Simulating function call for prompt: "${userPrompt}"`);

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        ...toolsPayload, // Spread the provided tools, toolConfig, and systemInstruction
    };

    return callGeminiAPI(payload, apiKey);
}
