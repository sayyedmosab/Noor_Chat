# **Google Gemini API JavaScript SDK Reference**

## **Current Official Package (2024/2025)**

**Package**: @google/genai (replaces the deprecated @google/generative-ai)

## **Installation**

npm install @google/genai

## **Authentication Options**

### **1\. API Key (Recommended for Client-Side)**

// Set environment variable  
// GEMINI\_API\_KEY=your\_api\_key\_here

// Or pass directly in code  
const client \= new GoogleGenerativeAI(apiKey);

### **2\. Application Default Credentials (Server-Side)**

\# Set up service account  
export GOOGLE\_APPLICATION\_CREDENTIALS="/path/to/service-account.json"

### **3\. OAuth2 (User Authentication)**

import {GoogleAuth} from 'google-auth-library';

const auth \= new GoogleAuth({  
  scopes: \['\[https://www.googleapis.com/auth/cloud-platform\](https://www.googleapis.com/auth/cloud-platform)'\]  
});

## **Basic Text Generation**

### **Method A: Using Official Client Library**

// ESM Import  
import {TextServiceClient} from '@google-ai/generativelanguage';

async function generateText() {  
  const client \= new TextServiceClient();  
    
  const request \= {  
    model: 'models/gemini-1.5-flash',  // or gemini-1.5-pro  
    prompt: {  
      text: 'Write a short friendly email inviting a colleague to lunch tomorrow.'  
    },  
    // Optional parameters  
    temperature: 0.7,  
    maxOutputTokens: 256,  
    topP: 0.8,  
    topK: 40  
  };

  const \[response\] \= await client.generateText(request);  
  const content \= response.candidates?.\[0\]?.content ?? '';  
  return content;  
}

### **Method B: Direct REST API Calls**

import fetch from 'node-fetch';  
import {GoogleAuth} from 'google-auth-library';

async function generateTextRest(prompt) {  
  const auth \= new GoogleAuth({  
    scopes: \['\[https://www.googleapis.com/auth/cloud-platform\](https://www.googleapis.com/auth/cloud-platform)'\]  
  });

  const client \= await auth.getClient();  
  const accessToken \= await client.getAccessToken();

  const url \= '\[https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5-flash:generate\](https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5-flash:generate)';  
    
  const body \= {  
    prompt: { text: prompt },  
    temperature: 0.7,  
    maxOutputTokens: 1024  
  };

  const response \= await fetch(url, {  
    method: 'POST',  
    headers: {  
      'Content-Type': 'application/json',  
      'Authorization': \`Bearer ${accessToken.token}\`  
    },  
    body: JSON.stringify(body)  
  });

  if (\!response.ok) {  
    throw new Error(\`API error ${response.status}: ${await response.text()}\`);  
  }

  const json \= await response.json();  
  return json.candidates?.\[0\]?.content ?? '';  
}

### **Method C: Simple API Key Approach (Cloudflare Workers Compatible)**

async function generateWithApiKey(prompt, apiKey) {  
  const url \= \`https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5-flash:generateContent?key=${apiKey}\`;  
    
  const body \= {  
    contents: \[{  
      parts: \[{ text: prompt }\]  
    }\],  
    generationConfig: {  
      temperature: 0.7,  
      maxOutputTokens: 1024,  
      topP: 0.8,  
      topK: 40  
    }  
  };

  const response \= await fetch(url, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify(body)  
  });

  if (\!response.ok) {  
    throw new Error(\`Gemini API error: ${response.status}\`);  
  }

  const data \= await response.json();  
  return data.candidates?.\[0\]?.content?.parts?.\[0\]?.text ?? '';  
}

## **Available Models**

* gemini-1.5-pro \- Most capable model  
* gemini-1.5-flash \- Faster, optimized for speed  
* gemini-2.0-flash-exp \- Latest experimental model

## **Request Parameters**

const generationConfig \= {  
  temperature: 0.7,        // 0.0 to 2.0, controls randomness  
  maxOutputTokens: 1024,   // Maximum response length  
  topP: 0.8,               // Nucleus sampling parameter  
  topK: 40,                // Top-k sampling parameter  
  stopSequences: \['END'\], // Array of stop sequences  
};

const safetySettings \= \[  
  {  
    category: 'HARM\_CATEGORY\_HARASSMENT',  
    threshold: 'BLOCK\_MEDIUM\_AND\_ABOVE'  
  },  
  {  
    category: 'HARM\_CATEGORY\_HATE\_SPEECH',   
    threshold: 'BLOCK\_MEDIUM\_AND\_ABOVE'  
  }  
\];

## **Streaming Responses**

async function generateStreamingText(prompt, apiKey) {  
  const url \= \`https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}\`;  
    
  const response \= await fetch(url, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({  
      contents: \[{ parts: \[{ text: prompt }\] }\]  
    })  
  });

  const reader \= response.body.getReader();  
  const decoder \= new TextDecoder();  
    
  while (true) {  
    const { done, value } \= await reader.read();  
    if (done) break;  
      
    const chunk \= decoder.decode(value);  
    // Process streaming chunks  
    console.log(chunk);  
  }  
}

## **Error Handling**

async function generateWithErrorHandling(prompt, apiKey) {  
  try {  
    const response \= await generateWithApiKey(prompt, apiKey);  
    return response;  
  } catch (error) {  
    if (error.message.includes('403')) {  
      throw new Error('API key invalid or quota exceeded');  
    } else if (error.message.includes('400')) {  
      throw new Error('Invalid request format');  
    } else if (error.message.includes('429')) {  
      throw new Error('Rate limit exceeded');  
    } else {  
      throw new Error(\`Gemini API error: ${error.message}\`);  
    }  
  }  
}

## **TypeScript Types**

interface GeminiRequest {  
  contents: Array\<{  
    parts: Array\<{ text: string }\>;  
  }\>;  
  generationConfig?: {  
    temperature?: number;  
    maxOutputTokens?: number;  
    topP?: number;  
    topK?: number;  
    stopSequences?: string\[\];  
  };  
  safetySettings?: Array\<{  
    category: string;  
    threshold: string;  
  }\>;  
}

interface GeminiResponse {  
  candidates: Array\<{  
    content: {  
      parts: Array\<{ text: string }\>;  
    };  
    finishReason: string;  
    safetyRatings: Array\<any\>;  
  }\>;  
  usageMetadata?: {  
    promptTokenCount: number;  
    candidatesTokenCount: number;  
    totalTokenCount: number;  
  };  
}

## **Environment Variables for Cloudflare Workers**

\# In .dev.vars file  
GEMINI\_API\_KEY=your\_api\_key\_here

\# In wrangler.toml  
\[vars\]  
GEMINI\_API\_KEY \= "your\_api\_key\_here"

\# Or use secrets for production  
wrangler secret put GEMINI\_API\_KEY

## **Best Practices**

1. **Use API Keys for Cloudflare Workers** \- Simpler than OAuth  
2. **Set appropriate temperature** \- Lower (0.2) for factual, higher (0.8) for creative  
3. **Handle rate limits** \- Implement exponential backoff  
4. **Validate responses** \- Check for empty or error responses  
5. **Use streaming** \- For long responses to improve UX  
6. **Set safety filters** \- Configure appropriate content filtering

## **Common Issues**

* **403 Forbidden**: Check API key validity and billing  
* **400 Bad Request**: Verify request format and model name  
* **429 Rate Limited**: Implement retry with exponential backoff  
* **Empty responses**: Check safety filters and prompt content

