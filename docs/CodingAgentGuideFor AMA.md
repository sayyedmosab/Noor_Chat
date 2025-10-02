Gemini Coding Agent Usage Guide
This guide explains how to use the gemini_agent.js script to programmatically interact with the Google Gemini API for code generation and function call simulation.

This script uses ES Modules (import/export) and top-level await, so it should be run in an environment that supports them, such as Node.js v14.8+ or a modern browser.

Step 1: Add Your API Key
Before running the script, you must add your Google Gemini API key.

Open the gemini_agent.js file.

The functions generateCode and simulateFunctionCall require the API key to be passed as an argument. You can store your key in a variable or an environment variable for security.

Step 2: Create a Runner Script
Create a new file named run_agent.js in the same directory as gemini_agent.js. This file will import and use the agent's functions.

// run_agent.js

// Import the agent functions
import { generateCode, simulateFunctionCall } from './gemini_agent.js';

// --- IMPORTANT ---
// Replace "" with your actual Google Gemini API key
const GEMINI_API_KEY = "";

// --- Main execution function ---
async function main() {
    console.log("--- Running Code Generation Task ---");
    try {
        const codePrompt = "a function that calculates the factorial of a number recursively";
        const generatedCode = await generateCode(codePrompt, GEMINI_API_KEY);
        console.log("Generated Code:\n", generatedCode);
    } catch (error) {
        console.error("Code Generation Failed:", error.message);
    }

    console.log("\n" + "-".repeat(40) + "\n");

    console.log("--- Running Function Call Simulation Task ---");
    try {
        const functionPrompt = "Schedule a sprint planning meeting with the dev team for this Friday at 10:30am";
        const functionCallJson = await simulateFunctionCall(functionPrompt, GEMINI_API_KEY);
        console.log("Suggested Function Call:\n", functionCallJson);
    } catch (error) {
        console.error("Function Call Simulation Failed:", error.message);
    }
}

// Run the main function
main();

Step 3: Run the Agent
If you are using Node.js, you can run the agent from your terminal.

Make sure you have Node.js installed.

Save both gemini_agent.js and run_agent.js.

Open your terminal in the directory where you saved the files.

Run the following command:

node run_agent.js

You will see the output from both the code generation and function call simulation tasks printed to your console.