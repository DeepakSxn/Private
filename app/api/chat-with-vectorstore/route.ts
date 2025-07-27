import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Allow responses up to 30 seconds
export const maxDuration = 30

interface ChatMessage {
  role: string
  content: string
  fileContent?: string
  file?: { fileContent?: string }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    console.log('🚀 ===== CHAT-WITH-VECTORSTORE API CALLED =====');
    
    const { messages: chatMessages } = await req.json()
    const lastMessage: ChatMessage = chatMessages[chatMessages.length - 1]

    console.log('🔧 Query:', lastMessage.content);
    console.log('🔧 Total messages in request:', chatMessages.length);

    console.log('🔧 Environment variables loaded:', {
      OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
      VECTOR_STORE_ID: process.env.VECTOR_STORE_ID
    });

    // Validate that we have the assistant ID
    if (!process.env.OPENAI_ASSISTANT_ID) {
      console.error('❌ CRITICAL: OPENAI_ASSISTANT_ID environment variable is not set!');
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "❌ Assistant ID not configured. Please check your environment variables." })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    console.log('✅ OPENAI_ASSISTANT_ID environment variable is set correctly');

    // Handle file attachments
    if (
      lastMessage.content?.startsWith("Attached file (") &&
      lastMessage.fileContent &&
      typeof lastMessage.fileContent === "string" &&
      lastMessage.fileContent.trim().length > 0
    ) {
      console.log('📎 Processing file attachment');
      
      let fileContent = lastMessage.fileContent || lastMessage.file?.fileContent
      const maxLength = 6000
      if (fileContent && fileContent.length > maxLength) {
        fileContent = fileContent.slice(0, maxLength) + '\n... (truncated)'
      }

      const lines = lastMessage.content.split('\n')
      const userQuery = lines.slice(1).join('\n').trim()
      
      // Create a thread for file processing
      const thread = await openai.beta.threads.create({})
      const threadId = thread.id
      console.log('📎 Created thread for file processing:', threadId);

      // Add the file content and user query to the thread
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `File content: ${fileContent}\n\nUser question: ${userQuery}`
      });

      // Run the assistant
      const runStream = openai.beta.threads.runs.stream(threadId, {
        assistant_id: process.env.OPENAI_ASSISTANT_ID || "",
        tool_choice: "required"
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let accumulatedContent = "";
            for await (const event of runStream) {
              if (event.event === 'thread.message.delta' && event.data?.delta?.content) {
                const deltaContent = event.data.delta.content;
                let content = "";
                if (Array.isArray(deltaContent)) {
                  content = deltaContent
                    .map((c: any) => {
                      if (c && typeof c.text === "object" && typeof c.text.value === "string") return c.text.value;
                      if (typeof c.text === "string") return c.text;
                      if (typeof c === "string") return c;
                      return "";
                    })
                    .join("");
                } else if (typeof deltaContent === "string") {
                  content = deltaContent;
                }
                if (content) {
                  accumulatedContent += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle web search requests
    const webSearchKeywords = ["search web", "look online", "google it", "search it online"]
    const isWebSearch = webSearchKeywords.some(keyword =>
      lastMessage.content?.toLowerCase().includes(keyword)
    )

    if (isWebSearch) {
      console.log('🌐 Web search requested');
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "🔍 Web search requested. (Web search is not implemented in this route. Please try again through the web search endpoint.)" })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Main Assistant API call - Let the assistant handle file search automatically
    console.log('🚀 Calling OpenAI Assistant API for:', lastMessage.content);

    // Create a thread
    const thread = await openai.beta.threads.create({})
    const threadId = thread.id
    console.log('📝 Created thread:', threadId);

    // Add all messages to the thread
    for (const msg of chatMessages) {
      await openai.beta.threads.messages.create(threadId, {
        role: msg.role,
        content: msg.content
      });
    }

    // Run the assistant with file_search enabled (it will automatically search through attached files)
    const runStream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID || "",
      tool_choice: "required" // This ensures the assistant uses its file_search tool
    });

    console.log('🔄 Starting assistant run with tool_choice: required');
    
    // Return streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulatedContent = "";
          let toolUsed = false;
          
          for await (const event of runStream) {
            console.log('📡 Event:', event.event);
            
            if (event.event === 'thread.run.requires_action') {
              console.log('🔧 Tool usage detected');
              toolUsed = true;
            }
            
            if (event.event === 'thread.message.delta' && event.data?.delta?.content) {
              const deltaContent = event.data.delta.content;
              let content = "";
              if (Array.isArray(deltaContent)) {
                content = deltaContent
                  .map((c: any) => {
                    if (c && typeof c.text === "object" && typeof c.text.value === "string") return c.text.value;
                    if (typeof c.text === "string") return c.text;
                    if (typeof c === "string") return c;
                    return "";
                  })
                  .join("");
              } else if (typeof deltaContent === "string") {
                content = deltaContent;
              }
              if (content) {
                accumulatedContent += content;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
          }
          
          // If no content was generated, provide fallback
          if (!accumulatedContent.trim()) {
            console.log('⚠️ No content generated, providing fallback');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "❌ No relevant data found in the knowledge base." })}\n\n`));
          }
          
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error('❌ Error in streaming response:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("❌ Error in chat API:", error);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "❌ An error occurred while processing your request." })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
} 