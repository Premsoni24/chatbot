import dotenv from "dotenv";
dotenv.config();
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";
import OpenAI from "openai";
const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const Cache = new NodeCache( { stdTTL: 60*60*24 } ); //24 hours cache


function needsWebSearch(message) {
  return /\b(?:when|date|current|currently|today|latest|recent|now|weather|news|price|launch\w*|laun\w*|release\w*|forecast|stock|prime minister|president|ceo)\b/i.test(message);
}

export async function generate({userMessage, threadId}) {
   const baseMessages =[
    {
      "role": "system",
      "content": `You are a smart personal assistant.

If you know the answer to a question, answer it directly in plain English.
If the answer requires real-time, local, or up-to-date information, or if you do not know the answer, use the available tools to find it.
Always verify product launch and release dates, current officeholders, and other changing facts with webSearch. If the results do not verify a fact, say that you could not verify it instead of guessing.

You have access to the following tool:
webSearch(query: string): Search the internet for current or unknown information.

Decide when to use your own knowledge and when to use the tool. Do not mention the tool unless needed.

Examples:
Q: What is the capital of France?
A: The capital of France is Paris.

Q: What's the weather in Mumbai right now?
A: Use the search tool to find the latest weather.

Q: Who is the Prime Minister of India?
A: Use webSearch to verify the current officeholder.

Q: Tell me the latest IT news.
A: Use the search tool to get the latest news.

Q: When did the iPhone 18 Pro Max launch, and when did the standard iPhone 18 launch?
A: Use webSearch and distinguish the Pro Max from the standard model. Give each model's date separately. Treat confirmed on-sale dates as facts, and label dates from leaks or analyst reports as estimates. Do not describe a future expected date as a launch that has already happened.

For current officeholders and other facts that may change, use webSearch to verify the answer before responding.

Current date and time: ${new Date().toUTCString()}`
    }
  ];
  const cachedMessages = Cache.get(threadId);
  console.log("NodeCache read:", {
    threadId,
    hit: cachedMessages !== undefined,
    keys: Cache.keys(),
  });
  const messages = cachedMessages ?? baseMessages;

     messages.push({
      
      "role": "user",
      "content": userMessage ,
    
  });

  let mustSearch = needsWebSearch(userMessage);

  const maxIterations = 10;
  let count = 0;
  while(true){

    if(count >= maxIterations){
      throw new Error("Maximum iterations reached. The model may be stuck in a loop.");
    }
const completion = await client.chat.completions.create({
    temperature: 0.0,
   
    model: "openai/gpt-oss-20b",
  
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "webSearch",
        "description": "Search the latest information on the internet",
        "parameters": {
          // JSON Schema object
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "the search query to perform search on."
            }
          },
          "required": ["query"]
        }
      }
    
 }
         
  ],
  tool_choice: mustSearch ? 'required' : 'auto',
  messages: messages,
   
});

messages.push(completion.choices[0].message);

const assistantMessage = completion.choices[0].message;

const toolCalls = assistantMessage.tool_calls ?? [];

if (toolCalls.length === 0) {
   if (mustSearch) {
     throw new Error("The model did not search for a time-sensitive question.");
   }
   Cache.set(threadId, messages);
   console.log("NodeCache write:", {
     threadId,
     saved: Cache.get(threadId),
     keys: Cache.keys(),
   });
   return assistantMessage.content;
    
}

for(const tool of toolCalls){
    // console.log('tool: ',tool);
    const functionName = tool.function.name;
    const fucntionParams = tool.function.arguments;

    if(functionName === 'webSearch') {
        const toolResult = await webSearch(JSON.parse(fucntionParams));
        // console.log('webSearch result: ', toolResult);

        messages.push({
          tool_call_id: tool.id,
          role: 'tool',
          name: functionName,
          content: toolResult,
        });
    } else {
        throw new Error(`Unknown tool requested: ${functionName}`);
    }
}
mustSearch = false;
  }
}



async function webSearch({ query }) {
 // Here we will do tavily api call:
 console.log("calling web Search...");
 
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const response = await tvly.search(query);

// console.log(response.results[0].content);
const finalResult = response.results
  .map((result, index) => [
    `Result ${index + 1}`,
    result.title && `Title: ${result.title}`,
    result.url && `URL: ${result.url}`,
    result.content && `Content: ${result.content}`,
  ].filter(Boolean).join('\n'))
  .filter(Boolean)
  .join('\n\n');

return finalResult || `No web search results were found for: ${query}`;
}
