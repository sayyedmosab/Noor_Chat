# **Text generation**

The Gemini API can generate text output from various inputs, including text, images, video, and audio, leveraging Gemini models.

Here's a basic example that takes a single text input:

\<details\>

\<summary\>Python\</summary\>

import google.generativeai as genai

genai.configure(api\_key="YOUR\_API\_KEY")

\# Create the model  
model \= genai.GenerativeModel('gemini-2.5-flash')

response \= model.generate\_content("How does AI work?")

print(response.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI } from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const response \= await ai.models.generateContent({  
    model: "gemini-2.5-flash",  
    contents: "How does AI work?",  
  });  
  console.log(response.text);  
}

await main();

\</details\>

\<details\>

\<summary\>Go\</summary\>

package main

import (  
	"context"  
	"fmt"  
	"log"

	"\[github.com/google/generative-ai-go/genai\](https://github.com/google/generative-ai-go/genai)"  
	"google.golang.org/api/option"  
)

func main() {  
	ctx := context.Background()  
	// Access your API key as an environment variable or directly insert it.  
	// See \[https://ai.google.dev/gemini-api/docs/api-key\#protect-your-api-key\](https://ai.google.dev/gemini-api/docs/api-key\#protect-your-api-key)  
	client, err := genai.NewClient(ctx, option.WithAPIKey("YOUR\_API\_KEY"))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")  
	resp, err := model.GenerateContent(ctx, genai.Text("How does AI work?"))  
	if err \!= nil {  
		log.Fatal(err)  
	}

	fmt.Println(resp.Candidates\[0\].Content.Parts\[0\])  
}

\</details\>

\<details\>

\<summary\>REST\</summary\>

curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[{  
        "parts":\[{"text": "How does AI work?"}\]  
      }\]  
    }'

\</details\>

\<details\>

\<summary\>Apps Script\</summary\>

function callGemini() {  
  var apiKey \= "YOUR\_API\_KEY";  
  var url \= "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=)" \+ apiKey;

  var data \= {  
    "contents": \[{  
      "parts": \[{"text": "How does AI work?"}\]  
    }\]  
  };

  var options \= {  
    'method': 'post',  
    'contentType': 'application/json',  
    'payload': JSON.stringify(data)  
  };

  var response \= UrlFetchApp.fetch(url, options);  
  var json \= response.getContentText();  
  var parsedData \= JSON.parse(json);  
  Logger.log(parsedData.candidates\[0\].content.parts\[0\].text);  
}

\</details\>

## **Thinking with Gemini 2.5**

2.5 Flash and Pro models have "thinking" enabled by default to enhance quality, which may take longer to run and increase token usage.

When using 2.5 Flash, you can disable thinking by setting the thinking budget to zero.

For more details, see the thinking guide.

\<details\>

\<summary\>Python\</summary\>

import google.generativeai as genai

genai.configure(api\_key="YOUR\_API\_KEY")

model \= genai.GenerativeModel('gemini-2.5-flash')

response \= model.generate\_content(  
    "How does AI work?",  
    generation\_config=genai.types.GenerationConfig(  
        thinking\_config={'thinking\_budget': 0} \# Disables thinking  
    )  
)

print(response.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI } from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const response \= await ai.models.generateContent({  
    model: "gemini-2.5-flash",  
    contents: "How does AI work?",  
    config: {  
      thinkingConfig: {  
        thinkingBudget: 0, // Disables thinking  
      },  
    }  
  });  
  console.log(response.text);  
}

await main();

\</details\>

\<details\>

\<summary\>Go\</summary\>

package main

import (  
	"context"  
	"fmt"  
	"log"

	"\[github.com/google/generative-ai-go/genai\](https://github.com/google/generative-ai-go/genai)"  
	"google.golang.org/api/option"  
)

func main() {  
	ctx := context.Background()  
	client, err := genai.NewClient(ctx, option.WithAPIKey("YOUR\_API\_KEY"))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")  
    model.ThinkingConfig \= \&genai.ThinkingConfig{  
        ThinkingBudget: 0, // Disables thinking  
    }

	resp, err := model.GenerateContent(ctx, genai.Text("How does AI work?"))  
	if err \!= nil {  
		log.Fatal(err)  
	}

	fmt.Println(resp.Candidates\[0\].Content.Parts\[0\])  
}

\</details\>

\<details\>

\<summary\>REST\</summary\>

curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[{  
        "parts":\[{"text": "How does AI work?"}\]  
      }\],  
      "generationConfig": {  
        "thinkingConfig": {  
          "thinkingBudget": 0  
        }  
      }  
    }'

\</details\>

\<details\>

\<summary\>Apps Script\</summary\>

function callGeminiWithThinkingDisabled() {  
  var apiKey \= "YOUR\_API\_KEY";  
  var url \= "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=)" \+ apiKey;

  var data \= {  
    "contents": \[{  
      "parts": \[{"text": "How does AI work?"}\]  
    }\],  
    "generationConfig": {  
      "thinkingConfig": {  
        "thinkingBudget": 0  
      }  
    }  
  };

  var options \= {  
    'method': 'post',  
    'contentType': 'application/json',  
    'payload': JSON.stringify(data)  
  };

  var response \= UrlFetchApp.fetch(url, options);  
  var json \= response.getContentText();  
  var parsedData \= JSON.parse(json);  
  Logger.log(parsedData.candidates\[0\].content.parts\[0\].text);  
}

\</details\>

## **System instructions and other configurations**

You can guide the behavior of Gemini models with system instructions. To do so, pass a GenerateContentConfig object.

\<details\>

\<summary\>Python\</summary\>

import google.generativeai as genai

genai.configure(api\_key="YOUR\_API\_KEY")

model \= genai.GenerativeModel(  
    'gemini-2.5-flash',  
    system\_instruction="You are a cat. Your name is Neko."  
)

response \= model.generate\_content("Hello there")  
print(response.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI } from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const response \= await ai.models.generateContent({  
    model: "gemini-2.5-flash",  
    contents: "Hello there",  
    config: {  
      systemInstruction: "You are a cat. Your name is Neko.",  
    },  
  });  
  console.log(response.text);  
}

await main();

\</details\>

\<details\>

\<summary\>Go\</summary\>

package main

import (  
	"context"  
	"fmt"  
	"log"

	"\[github.com/google/generative-ai-go/genai\](https://github.com/google/generative-ai-go/genai)"  
	"google.golang.org/api/option"  
)

func main() {  
	ctx := context.Background()  
	client, err := genai.NewClient(ctx, option.WithAPIKey("YOUR\_API\_KEY"))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")  
    model.SystemInstruction \= \&genai.Content{  
        Parts: \[\]genai.Part{genai.Text("You are a cat. Your name is Neko.")},  
    }

	resp, err := model.GenerateContent(ctx, genai.Text("Hello there"))  
	if err \!= nil {  
		log.Fatal(err)  
	}

	fmt.Println(resp.Candidates\[0\].Content.Parts\[0\])  
}

\</details\>

\<details\>

\<summary\>REST\</summary\>

curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[{"parts":\[{"text": "Hello there"}\]}\],  
      "system\_instruction": {  
        "parts": \[  
          {"text": "You are a cat. Your name is Neko."}  
        \]  
      }  
    }'

\</details\>

\<details\>

\<summary\>Apps Script\</summary\>

function callGeminiWithSystemInstruction() {  
  var apiKey \= "YOUR\_API\_KEY";  
  var url \= "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=)" \+ apiKey;

  var data \= {  
    "contents": \[{"parts":\[{"text": "Hello there"}\]}\],  
    "system\_instruction": {  
      "parts": \[  
        {"text": "You are a cat. Your name is Neko."}  
      \]  
    }  
  };

  var options \= {  
    'method': 'post',  
    'contentType': 'application/json',  
    'payload': JSON.stringify(data)  
  };

  var response \= UrlFetchApp.fetch(url, options);  
  var json \= response.getContentText();  
  var parsedData \= JSON.parse(json);  
  Logger.log(parsedData.candidates\[0\].content.parts\[0\].text);  
}

\</details\>

The GenerateContentConfig object also lets you override default generation parameters, such as temperature.

\<details\>

\<summary\>Python\</summary\>

import google.generativeai as genai

genai.configure(api\_key="YOUR\_API\_KEY")

model \= genai.GenerativeModel('gemini-2.5-flash')

response \= model.generate\_content(  
    "Explain how AI works",  
    generation\_config=genai.types.GenerationConfig(  
        temperature=0.1  
    )  
)

print(response.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI } from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const response \= await ai.models.generateContent({  
    model: "gemini-2.5-flash",  
    contents: "Explain how AI works",  
    config: {  
      temperature: 0.1,  
    },  
  });  
  console.log(response.text);  
}

await main();

\</details\>

\<details\>

\<summary\>Go\</summary\>

package main

import (  
	"context"  
	"fmt"  
	"log"

	"\[github.com/google/generative-ai-go/genai\](https://github.com/google/generative-ai-go/genai)"  
	"google.golang.org/api/option"  
)

func main() {  
	ctx := context.Background()  
	client, err := genai.NewClient(ctx, option.WithAPIKey("YOUR\_API\_KEY"))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")  
    temp := float32(0.1)  
    model.GenerationConfig \= \&genai.GenerationConfig{  
        Temperature: \&temp,  
    }

	resp, err := model.GenerateContent(ctx, genai.Text("Explain how AI works"))  
	if err \!= nil {  
		log.Fatal(err)  
	}

	fmt.Println(resp.Candidates\[0\].Content.Parts\[0\])  
}

\</details\>

\<details\>

\<summary\>REST\</summary\>

curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[{  
        "parts":\[{"text": "Explain how AI works"}\]  
      }\],  
      "generationConfig": {  
        "temperature": 0.1  
      }  
    }'

\</details\>

\<details\>

\<summary\>Apps Script\</summary\>

function callGeminiWithTemperature() {  
  var apiKey \= "YOUR\_API\_KEY";  
  var url \= "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=)" \+ apiKey;

  var data \= {  
    "contents": \[{  
      "parts": \[{"text": "Explain how AI works"}\]  
    }\],  
    "generationConfig": {  
      "temperature": 0.1  
    }  
  };

  var options \= {  
    'method': 'post',  
    'contentType': 'application/json',  
    'payload': JSON.stringify(data)  
  };

  var response \= UrlFetchApp.fetch(url, options);  
  var json \= response.getContentText();  
  var parsedData \= JSON.parse(json);  
  Logger.log(parsedData.candidates\[0\].content.parts\[0\].text);  
}

\</details\>

Refer to the GenerateContentConfig in our API reference for a complete list of configurable parameters and their descriptions.

## **Multimodal inputs**

The Gemini API supports multimodal inputs, allowing you to combine text with media files. The following example demonstrates providing an image:

\<details\>

\<summary\>Python\</summary\>

import google.generativeai as genai

genai.configure(api\_key="YOUR\_API\_KEY")

model \= genai.GenerativeModel('gemini-2.5-flash')

\# Upload the image  
image \= genai.upload\_file(path='/path/to/organ.png')

response \= model.generate\_content(\[  
    "Tell me about this instrument",  
    image  
\])

print(response.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import {  
  GoogleGenAI,  
  createUserContent,  
  createPartFromUri,  
} from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const image \= await ai.files.upload({  
    file: "/path/to/organ.png",  
  });  
  const response \= await ai.models.generateContent({  
    model: "gemini-2.5-flash",  
    contents: \[  
      createUserContent(\[  
        "Tell me about this instrument",  
        createPartFromUri(image.uri, image.mimeType),  
      \]),  
    \],  
  });  
  console.log(response.text);  
}

await main();

\</details\>

\<details\>

\<summary\>Go\</summary\>

package main

import (  
	"context"  
	"fmt"  
	"log"  
    "os"

	"\[github.com/google/generative-ai-go/genai\](https://github.com/google/generative-ai-go/genai)"  
	"google.golang.org/api/option"  
)

func main() {  
	ctx := context.Background()  
	client, err := genai.NewClient(ctx, option.WithAPIKey("YOUR\_API\_KEY"))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
	defer client.Close()

    imgData, err := os.ReadFile("/path/to/organ.png")  
    if err \!= nil {  
        log.Fatal(err)  
    }

	model := client.GenerativeModel("gemini-2.5-flash")  
	resp, err := model.GenerateContent(ctx, genai.Text("Tell me about this instrument"), genai.ImageData("png", imgData))  
	if err \!= nil {  
		log.Fatal(err)  
	}

	fmt.Println(resp.Candidates\[0\].Content.Parts\[0\])  
}

\</details\>

\<details\>

\<summary\>REST\</summary\>

\# First, upload the file  
FILE\_UPLOAD\_RESPONSE=$(curl "\[https://generativelanguage.googleapis.com/v1beta/files?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/files?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: multipart/form-data' \\  
    \-F 'file=@/path/to/organ.png')

FILE\_URI=$(echo $FILE\_UPLOAD\_RESPONSE | sed \-n 's/.\*"uri": "\\(\[^"\]\*\\)".\*/\\1/p')

\# Then, make the generateContent call with the file URI  
curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[{  
        "parts":\[  
          {"text": "Tell me about this instrument"},  
          {"file\_data": {"mime\_type": "image/png", "file\_uri": "'$FILE\_URI'"}}  
        \]  
      }\]  
    }'

\</details\>

For alternative methods of providing images and more advanced image processing, see our image understanding guide. The API also supports document, video, and audio inputs and understanding.

## **Streaming responses**

By default, the model returns a response only after the entire generation process is complete.

For more fluid interactions, use streaming to receive GenerateContentResponse instances incrementally as they're generated.

\<details\>

\<summary\>Python\</summary\>

import google.generativeai as genai

genai.configure(api\_key="YOUR\_API\_KEY")

model \= genai.GenerativeModel('gemini-2.5-flash')

response \= model.generate\_content(  
    "Explain how AI works",  
    stream=True  
)

for chunk in response:  
    print(chunk.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI } from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const response \= await ai.models.generateContentStream({  
    model: "gemini-2.5-flash",  
    contents: "Explain how AI works",  
  });

  for await (const chunk of response) {  
    console.log(chunk.text);  
  }  
}

await main();

\</details\>

\<details\>

\<summary\>Go\</summary\>

package main

import (  
	"context"  
	"fmt"  
	"log"  
    "io"

	"\[github.com/google/generative-ai-go/genai\](https://github.com/google/generative-ai-go/genai)"  
	"google.golang.org/api/option"  
)

func main() {  
	ctx := context.Background()  
	client, err := genai.NewClient(ctx, option.WithAPIKey("YOUR\_API\_KEY"))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")  
	iter := model.GenerateContentStream(ctx, genai.Text("Explain how AI works"))

	for {  
		resp, err := iter.Next()  
		if err \== io.EOF {  
			break  
		}  
		if err \!= nil {  
			log.Fatal(err)  
		}  
		fmt.Println(resp.Candidates\[0\].Content.Parts\[0\])  
	}  
}

\</details\>

\<details\>

\<summary\>REST\</summary\>

curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[{  
        "parts":\[{"text": "Explain how AI works"}\]  
      }\]  
    }'

\</details\>

\<details\>

\<summary\>Apps Script\</summary\>

function streamGemini() {  
  // Apps Script does not support true streaming. This simulates it by making a request  
  // and logging the full response. For a real streaming experience, you would need  
  // a different environment.  
  var apiKey \= "YOUR\_API\_KEY";  
  var url \= "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=)" \+ apiKey;

  var data \= {  
    "contents": \[{  
      "parts": \[{"text": "Explain how AI works"}\]  
    }\]  
  };

  var options \= {  
    'method': 'post',  
    'contentType': 'application/json',  
    'payload': JSON.stringify(data)  
  };

  var response \= UrlFetchApp.fetch(url, options);  
  var json \= response.getContentText();  
  var parsedData \= JSON.parse(json);  
  Logger.log(parsedData.candidates\[0\].content.parts\[0\].text);  
}

\</details\>

## **Multi-turn conversations (Chat)**

Our SDKs provide functionality to collect multiple rounds of prompts and responses into a chat, giving you an easy way to keep track of the conversation history.

**Note:** Chat functionality is only implemented as part of the SDKs. Behind the scenes, it still uses the generateContent API. For multi-turn conversations, the full conversation history is sent to the model with each follow-up turn.

\<details\>

\<summary\>Python\</summary\>

import google.generativeai as genai

genai.configure(api\_key="YOUR\_API\_KEY")

model \= genai.GenerativeModel('gemini-2.5-flash')  
chat \= model.start\_chat(history=\[  
    {'role':'user', 'parts': \['Hello'\]},  
    {'role':'model', 'parts': \['Great to meet you. What would you like to know?'\]}  
\])

response1 \= chat.send\_message("I have 2 dogs in my house.")  
print("Chat response 1:", response1.text)

response2 \= chat.send\_message("How many paws are in my house?")  
print("Chat response 2:", response2.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI } from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const chat \= ai.chats.create({  
    model: "gemini-2.5-flash",  
    history: \[  
      {  
        role: "user",  
        parts: \[{ text: "Hello" }\],  
      },  
      {  
        role: "model",  
        parts: \[{ text: "Great to meet you. What would you like to know?" }\],  
      },  
    \],  
  });

  const response1 \= await chat.sendMessage({  
    message: "I have 2 dogs in my house.",  
  });  
  console.log("Chat response 1:", response1.text);

  const response2 \= await chat.sendMessage({  
    message: "How many paws are in my house?",  
  });  
  console.log("Chat response 2:", response2.text);  
}

await main();

\</details\>

\<details\>

\<summary\>Go\</summary\>

package main

import (  
	"context"  
	"fmt"  
	"log"

	"\[github.com/google/generative-ai-go/genai\](https://github.com/google/generative-ai-go/genai)"  
	"google.golang.org/api/option"  
)

func main() {  
	ctx := context.Background()  
	client, err := genai.NewClient(ctx, option.WithAPIKey("YOUR\_API\_KEY"))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")  
    cs := model.StartChat()

    // First turn  
    \_, err \= cs.SendMessage(ctx, genai.Text("Hello"))  
    if err \!= nil {  
        log.Fatal(err)  
    }

    // Second turn (model response)  
    \_, err \= cs.SendMessage(ctx, genai.Text("Great to meet you. What would you like to know?"))  
    if err \!= nil {  
        log.Fatal(err)  
    }  
      
    // Third Turn  
    resp1, err := cs.SendMessage(ctx, genai.Text("I have 2 dogs in my house."))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
    fmt.Println("Chat response 1:", resp1.Candidates\[0\].Content.Parts\[0\])

    // Fourth Turn  
    resp2, err := cs.SendMessage(ctx, genai.Text("How many paws are in my house?"))  
	if err \!= nil {  
		log.Fatal(err)  
	}  
    fmt.Println("Chat response 2:", resp2.Candidates\[0\].Content.Parts\[0\])  
}

\</details\>

\<details\>

\<summary\>REST\</summary\>

\# First turn  
curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[  
        {"role": "user", "parts":\[{"text": "Hello"}\]},  
        {"role": "model", "parts":\[{"text": "Great to meet you. What would you like to know?"}\]},  
        {"role": "user", "parts":\[{"text": "I have 2 dogs in my house."}\]}  
      \]  
    }'

\# Second turn (includes history)  
curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[  
        {"role": "user", "parts":\[{"text": "Hello"}\]},  
        {"role": "model", "parts":\[{"text": "Great to meet you. What would you like to know?"}\]},  
        {"role": "user", "parts":\[{"text": "I have 2 dogs in my house."}\]},  
        {"role": "model", "parts":\[{"text": "That sounds lovely\! Two dogs must bring a lot of joy to your home."}\]},  
        {"role": "user", "parts":\[{"text": "How many paws are in my house?"}\]}  
      \]  
    }'

\</details\>

Streaming can also be used for multi-turn conversations.

\<details\>

\<summary\>Python\</summary\>

import google.generativeai as genai

genai.configure(api\_key="YOUR\_API\_KEY")

model \= genai.GenerativeModel('gemini-2.5-flash')  
chat \= model.start\_chat(history=\[  
    {'role':'user', 'parts': \['Hello'\]},  
    {'role':'model', 'parts': \['Great to meet you. What would you like to know?'\]}  
\])

stream1 \= chat.send\_message("I have 2 dogs in my house.", stream=True)  
for chunk in stream1:  
    print(chunk.text, end="")  
print("\\n" \+ "\_"\*80)

stream2 \= chat.send\_message("How many paws are in my house?", stream=True)  
for chunk in stream2:  
    print(chunk.text, end="")  
print("\\n" \+ "\_"\*80)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI } from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const chat \= ai.chats.create({  
    model: "gemini-2.5-flash",  
    history: \[  
      {  
        role: "user",  
        parts: \[{ text: "Hello" }\],  
      },  
      {  
        role: "model",  
        parts: \[{ text: "Great to meet you. What would you like to know?" }\],  
      },  
    \],  
  });

  const stream1 \= await chat.sendMessageStream({  
    message: "I have 2 dogs in my house.",  
  });  
  for await (const chunk of stream1) {  
    console.log(chunk.text);  
    console.log("\_".repeat(80));  
  }

  const stream2 \= await chat.sendMessageStream({  
    message: "How many paws are in my house?",  
  });  
  for await (const chunk of stream2) {  
    console.log(chunk.text);  
    console.log("\_".repeat(80));  
  }  
}

await main();

\</details\>

## **Structured output**

You can configure Gemini for structured output instead of unstructured text, allowing precise extraction and standardization of information for further processing. For example, you can use structured output to extract information from resumes, standardize them to build a structured database.

Gemini can generate either JSON or enum values as structured output.

### **Generating JSON**

To constrain the model to generate JSON, configure a responseSchema. The model will then respond to any prompt with JSON-formatted output.

\<details\>

\<summary\>Python\</summary\>

from google import genai  
from pydantic import BaseModel

class Recipe(BaseModel):  
    recipeName: str  
    ingredients: list\[str\]

client \= genai.Client()  
response \= client.models.generate\_content(  
    model='gemini-2.5-flash',  
    contents='List a few popular cookie recipes, and include the amounts of ingredients.',  
    config={  
        'response\_mime\_type': 'application/json',  
        'response\_schema': list\[Recipe\],  
    },  
)

print(response.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI, Type } from "@google/genai";

const ai \= new GoogleGenAI({});

async function main() {  
  const response \= await ai.models.generateContent({  
    model: "gemini-2.5-flash",  
    contents:  
      "List a few popular cookie recipes, and include the amounts of ingredients.",  
    config: {  
      responseMimeType: "application/json",  
      responseSchema: {  
        type: Type.ARRAY,  
        items: {  
          type: Type.OBJECT,  
          properties: {  
            recipeName: {  
              type: Type.STRING,  
            },  
            ingredients: {  
              type: Type.ARRAY,  
              items: {  
                type: Type.STRING,  
              },  
            },  
          },  
          propertyOrdering: \["recipeName", "ingredients"\],  
        },  
      },  
    },  
  });

  console.log(response.text);  
}

main();

\</details\>

\<details\>

\<summary\>Go\</summary\>

// Go does not have a direct equivalent for responseSchema at this time.  
// You would typically parse the JSON response manually.

\</details\>

\<details\>

\<summary\>REST\</summary\>

curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[{  
        "parts":\[{"text": "List a few popular cookie recipes, and include the amounts of ingredients."}\]  
      }\],  
      "generationConfig": {  
        "responseMimeType": "application/json",  
        "responseSchema": {  
          "type": "ARRAY",  
          "items": {  
            "type": "OBJECT",  
            "properties": {  
              "recipeName": {"type": "STRING"},  
              "ingredients": {"type": "ARRAY", "items": {"type": "STRING"}}  
            },  
            "propertyOrdering": \["recipeName", "ingredients"\]  
          }  
        }  
      }  
    }'

\</details\>

The output might look like this:

\[  
  {  
    "recipeName": "Chocolate Chip Cookies",  
    "ingredients": \[  
      "1 cup (2 sticks) unsalted butter, softened",  
      "3/4 cup granulated sugar",  
      "3/4 cup packed brown sugar",  
      "1 teaspoon vanilla extract",  
      "2 large eggs",  
      "2 1/4 cups all-purpose flour",  
      "1 teaspoon baking soda",  
      "1 teaspoon salt",  
      "2 cups chocolate chips"  
    \]  
  }  
\]

### **Generating enum values**

In some cases you might want the model to choose a single option from a list of options. To implement this behavior, you can pass an enum in your schema. You can use an enum option anywhere you could use a string in the responseSchema, because an enum is an array of strings. Like a JSON schema, an enum lets you constrain model output to meet the requirements of your application.

For example, assume that you're developing an application to classify musical instruments into one of five categories: "Percussion", "String", "Woodwind", "Brass", or "Keyboard". You could create an enum to help with this task.

In the following example, you pass an enum as the responseSchema, constraining the model to choose the most appropriate option.

\<details\>

\<summary\>Python\</summary\>

from google import genai

client \= genai.Client()  
response \= client.models.generate\_content(  
    model='gemini-2.5-flash',  
    contents='What type of instrument is an oboe?',  
    config={  
        'response\_mime\_type': 'text/x.enum',  
        'response\_schema': \["Percussion", "String", "Woodwind", "Brass", "Keyboard"\],  
    },  
)  
print(response.text)  
\# Woodwind

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI, Type } from "@google/genai";

const ai \= new GoogleGenAI({});

const response \= await ai.models.generateContent({  
    model: "gemini-2.5-flash",  
    contents: "What type of instrument is an oboe?",  
    config: {  
      responseMimeType: "text/x.enum",  
      responseSchema: {  
        type: Type.STRING,  
        enum: \["Percussion", "String", "Woodwind", "Brass", "Keyboard"\],  
      },  
    },  
  });

console.log(response.text);

\</details\>

\<details\>

\<summary\>REST\</summary\>

curl "\[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY\](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI\_API\_KEY)" \\  
    \-H 'Content-Type: application/json' \\  
    \-d '{  
      "contents": \[{  
        "parts":\[{"text": "What type of instrument is an oboe?"}\]  
      }\],  
      "generationConfig": {  
        "responseMimeType": "text/x.enum",  
        "responseSchema": {  
          "type": "STRING",  
          "enum": \["Percussion", "String", "Woodwind", "Brass", "Keyboard"\]  
        }  
      }  
    }'

\</details\>

## **Function calling with the Gemini API**

Function calling lets you connect models to external tools and APIs. Instead of generating text responses, the model determines when to call specific functions and provides the necessary parameters to execute real-world actions. This allows the model to act as a bridge between natural language and real-world actions and data. Function calling has 3 primary use cases:

* **Augment Knowledge:** Access information from external sources like databases, APIs, and knowledge bases.  
* **Extend Capabilities:** Use external tools to perform computations and extend the limitations of the model, such as using a calculator or creating charts.  
* **Take Actions:** Interact with external systems using APIs, such as scheduling appointments, creating invoices, sending emails, or controlling smart home devices.

### **How function calling works**

Function calling involves a structured interaction between your application, the model, and external functions. Here's a breakdown of the process:

1. **Define Function Declaration:** Define the function declaration in your application code. Function Declarations describe the function's name, parameters, and purpose to the model.  
2. **Call LLM with function declarations:** Send user prompt along with the function declaration(s) to the model. It analyzes the request and determines if a function call would be helpful. If so, it responds with a structured JSON object.  
3. **Execute Function Code (Your Responsibility):** The Model does not execute the function itself. It's your application's responsibility to process the response and check for Function Call, if  
   * **Yes:** Extract the name and args of the function and execute the corresponding function in your application.  
   * **No:** The model has provided a direct text response to the prompt (this flow is less emphasized in the example but is a possible outcome).  
4. **Create User friendly response:** If a function was executed, capture the result and send it back to the model in a subsequent turn of the conversation. It will use the result to generate a final, user-friendly response that incorporates the information from the function call.

This process can be repeated over multiple turns, allowing for complex interactions and workflows. The model also supports calling multiple functions in a single turn (parallel function calling) and in sequence (compositional function calling).

### **Step 1: Define a function declaration**

\<details\>

\<summary\>Python\</summary\>

from google import genai

\# Define a function that the model can call to control smart lights  
def set\_light\_values(brightness: float, color\_temp: str):  
    """Sets the brightness and color temperature of a light."""  
    return {"brightness": brightness, "colorTemperature": color\_temp}

set\_light\_values\_declaration \= genai.protos.FunctionDeclaration(  
    name='set\_light\_values',  
    description='Sets the brightness and color temperature of a light.',  
    parameters=genai.protos.Schema(  
        type=genai.protos.Type.OBJECT,  
        properties={  
            'brightness': genai.protos.Schema(type=genai.protos.Type.NUMBER, description='Light level from 0 to 100.'),  
            'color\_temp': genai.protos.Schema(type=genai.protos.Type.STRING, enum=\['daylight', 'cool', 'warm'\], description='Color temperature.'),  
        },  
        required=\['brightness', 'color\_temp'\]  
    )  
)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { Type } from '@google/genai';

// Define a function declaration that the model can call to control smart lights  
const setLightValuesFunctionDeclaration \= {  
  name: 'set\_light\_values',  
  description: 'Sets the brightness and color temperature of a light.',  
  parameters: {  
    type: Type.OBJECT,  
    properties: {  
      brightness: {  
        type: Type.NUMBER,  
        description: 'Light level from 0 to 100\. Zero is off and 100 is full brightness',  
      },  
      color\_temp: {  
        type: Type.STRING,  
        enum: \['daylight', 'cool', 'warm'\],  
        description: 'Color temperature of the light fixture, which can be \`daylight\`, \`cool\` or \`warm\`.',  
      },  
    },  
    required: \['brightness', 'color\_temp'\],  
  },  
};

/\*\*  
\* Set the brightness and color temperature of a room light. (mock API)  
\* @param {number} brightness \- Light level from 0 to 100\. Zero is off and 100 is full brightness  
\* @param {string} color\_temp \- Color temperature of the light fixture, which can be \`daylight\`, \`cool\` or \`warm\`.  
\* @return {Object} A dictionary containing the set brightness and color temperature.  
\*/  
function setLightValues({brightness, color\_temp}) {  
  return {  
    brightness: brightness,  
    colorTemperature: color\_temp  
  };  
}

\</details\>

### **Step 2: Call the model with function declarations**

\<details\>

\<summary\>Python\</summary\>

client \= genai.Client()  
response \= client.models.generate\_content(  
    model="gemini-2.5-flash",  
    contents=\[{'role': 'user', 'parts': \[{'text': 'Turn the lights down to a romantic level'}\]}\],  
    tools=\[set\_light\_values\_declaration\]  
)

print(response.candidates\[0\].content.parts\[0\].function\_call)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI } from '@google/genai';

// Generation config with function declaration  
const config \= {  
  tools: \[{  
    functionDeclarations: \[setLightValuesFunctionDeclaration\]  
  }\]  
};

// Configure the client  
const ai \= new GoogleGenAI({});

// Define user prompt  
const contents \= \[  
  {  
    role: 'user',  
    parts: \[{ text: 'Turn the lights down to a romantic level' }\]  
  }  
\];

// Send request with function declarations  
const response \= await ai.models.generateContent({  
  model: 'gemini-2.5-flash',  
  contents: contents,  
  config: config  
});

console.log(response.functionCalls\[0\]);

\</details\>

The model then returns a functionCall object:

{  
  "name": "set\_light\_values",  
  "args": { "brightness": 25, "color\_temp": "warm" }  
}

### **Step 3: Execute set\_light\_values function code**

\<details\>

\<summary\>Python\</summary\>

tool\_call \= response.candidates\[0\].content.parts\[0\].function\_call  
result \= None  
if tool\_call.name \== 'set\_light\_values':  
    result \= set\_light\_values(brightness=tool\_call.args\['brightness'\], color\_temp=tool\_call.args\['color\_temp'\])  
    print(f"Function execution result: {result}")

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

// Extract tool call details  
const tool\_call \= response.functionCalls\[0\]

let result;  
if (tool\_call.name \=== 'set\_light\_values') {  
  result \= setLightValues(tool\_call.args);  
  console.log(\`Function execution result: ${JSON.stringify(result)}\`);  
}

\</details\>

### **Step 4: Create user friendly response with function result and call the model again**

\<details\>

\<summary\>Python\</summary\>

response \= client.models.generate\_content(  
    model="gemini-2.5-flash",  
    contents=\[  
        {'role': 'user', 'parts': \[{'text': 'Turn the lights down to a romantic level'}\]},  
        response.candidates\[0\].content,  
        {'role': 'user', 'parts': \[  
            genai.protos.Part(  
                function\_response=genai.protos.FunctionResponse(  
                    name='set\_light\_values',  
                    response={'result': result}  
                )  
            )  
        \]}  
    \],  
    tools=\[set\_light\_values\_declaration\]  
)

print(response.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

// Create a function response part  
const function\_response\_part \= {  
  name: tool\_call.name,  
  response: { result }  
}

// Append function call and result of the function execution to contents  
contents.push(response.candidates\[0\].content);  
contents.push({ role: 'user', parts: \[{ functionResponse: function\_response\_part }\] });

// Get the final response from the model  
const final\_response \= await ai.models.generateContent({  
  model: 'gemini-2.5-flash',  
  contents: contents,  
  config: config  
});

console.log(final\_response.text);

\</details\>

This completes the function calling flow. The model successfully used the set\_light\_values function to perform the request action of the user.

## **Parallel function calling**

\<details\>

\<summary\>Python\</summary\>

from google import genai  
from google.genai import types

\# Actual function implementations  
def power\_disco\_ball\_impl(power: bool) \-\> dict:  
    """Powers the spinning disco ball."""  
    return {"status": f"Disco ball powered {'on' if power else 'off'}"}

def start\_music\_impl(energetic: bool, loud: bool) \-\> dict:  
    """Play some music matching the specified parameters."""  
    music\_type \= "energetic" if energetic else "chill"  
    volume \= "loud" if loud else "quiet"  
    return {"music\_type": music\_type, "volume": volume}

def dim\_lights\_impl(brightness: float) \-\> dict:  
    """Dim the lights."""  
    return {"brightness": brightness}

\# Configure the client  
client \= genai.Client()  
config \= types.GenerateContentConfig(  
    tools=\[power\_disco\_ball\_impl, start\_music\_impl, dim\_lights\_impl\],  
    tool\_config={'function\_calling\_config': {'mode': 'any'}}  
)

\# Make the request  
response \= client.models.generate\_content(  
    model="gemini-2.5-flash",  
    contents="Turn this place into a party\!",  
    config=config,  
)

print("Example 1: Forced function calling")  
for fn in response.candidates\[0\].content.parts:  
    if fn.function\_call:  
        args \= ", ".join(f"{k}={v}" for k, v in fn.function\_call.args.items())  
        print(f"{fn.function\_call.name}({args})")

\# Automatic function calling example  
response\_auto \= client.models.generate\_content(  
    model="gemini-2.5-flash",  
    contents="Do everything you need to this place into party\!",  
    config=types.GenerateContentConfig(tools=\[power\_disco\_ball\_impl, start\_music\_impl, dim\_lights\_impl\]),  
)  
print("\\nExample 2: Automatic function calling")  
print(response\_auto.text)

\</details\>

\<details\>

\<summary\>JavaScript\</summary\>

import { GoogleGenAI, Type } from '@google/genai';

const powerDiscoBall \= {  
  name: 'power\_disco\_ball',  
  description: 'Powers the spinning disco ball.',  
  parameters: {  
    type: Type.OBJECT,  
    properties: {  
      power: {  
        type: Type.BOOLEAN,  
        description: 'Whether to turn the disco ball on or off.'  
      }  
    },  
    required: \['power'\]  
  }  
};

const startMusic \= {  
  name: 'start\_music',  
  description: 'Play some music matching the specified parameters.',  
  parameters: {  
    type: Type.OBJECT,  
    properties: {  
      energetic: {  
        type: Type.BOOLEAN,  
        description: 'Whether the music is energetic or not.'  
      },  
      loud: {  
        type: Type.BOOLEAN,  
        description: 'Whether the music is loud or not.'  
      }  
    },  
    required: \['energetic', 'loud'\]  
  }  
};

const dimLights \= {  
  name: 'dim\_lights',  
  description: 'Dim the lights.',  
  parameters: {  
    type: Type.OBJECT,  
    properties: {  
      brightness: {  
        type: Type.NUMBER,  
        description: 'The brightness of the lights, 0.0 is off, 1.0 is full.'  
      }  
    },  
    required: \['brightness'\]  
  }  
};

// Set up function declarations  
const houseFns \= \[powerDiscoBall, startMusic, dimLights\];

const config \= {  
    tools: \[{  
        functionDeclarations: houseFns  
    }\],  
    // Force the model to call 'any' function, instead of chatting.  
    toolConfig: {  
        functionCallingConfig: {  
            mode: 'any'  
        }  
    }  
};

// Configure the client  
const ai \= new GoogleGenAI({});

// Create a chat session  
const chat \= ai.chats.create({  
    model: 'gemini-2.5-flash',  
    config: config  
});  
const response \= await chat.sendMessage({message: 'Turn this place into a party\!'});

// Print out each of the function calls requested from this single call  
console.log("Example 1: Forced function calling");  
for (const fn of response.functionCalls) {  
    const args \= Object.entries(fn.args)  
        .map((\[key, val\]) \=\> \`${key}=${val}\`)  
        .join(', ');  
    console.log(\`${fn.name}(${args})\`);  
}

\</details\>

