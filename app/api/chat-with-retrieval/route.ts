import { OpenAI } from "openai"
import { NextResponse } from 'next/server';

// Allow responses up to 30 seconds
export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const lastMessage = messages[messages.length - 1]

    console.log('Using assistant ID:', process.env.ASSISTANT_ID);
    console.log('Vector Store ID:', process.env.VECTOR_STORE_ID);

    // Create a thread
    const thread = await openai.beta.threads.create({})
    const threadId = thread.id
    console.log('Thread ID:', threadId);

    // Add all messages to the thread
    for (const msg of messages) {
      await openai.beta.threads.messages.create(threadId, {
        role: msg.role,
        content: msg.content,
      })
    }

    // Run the assistant with retrieval
    const runStream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: process.env.ASSISTANT_ID || "",
    })

    let accumulatedContent = "";
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runStream) {
            console.log('Event type:', event.event);
            
            if (event.event === 'thread.run.queued') {
              console.log('Run queued');
            } else if (event.event === 'thread.run.in_progress') {
              console.log('Run in progress');
            } else if (event.event === 'thread.run.completed') {
              console.log('Run completed');
            } else if (event.event === 'thread.message.completed') {
              console.log('Message completed');
            } else if (event.event === 'thread.message.delta') {
              console.log('Message delta received');
              if (event.data && event.data.delta && event.data.delta.content) {
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
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Error in assistant stream:", error);
          controller.error(error);
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return new Response(JSON.stringify({ error: "Failed to process your request" }), { status: 500 })
  }
} 