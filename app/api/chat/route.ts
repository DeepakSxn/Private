import { OpenAI } from "openai"

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

    // --- If file is attached: Use only file content and user query with Chat API ---
    if (lastMessage.content?.startsWith("Attached file (")) {
      // Prefer fileContent property if present
      const fileContent = lastMessage.fileContent || (() => {
        const match = lastMessage.content.match(/^Attached file \([^)]+\):\n\n([\s\S]+?)\n\nUser query:/);
        return match ? match[1] : "";
      })();
      const userQuery = lastMessage.content.split("User query:")[1]?.trim() || "";

      const promptMessages: OpenAI.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are an AI assistant. Use ONLY the following file content to answer the user's question. File content:\n${fileContent}`
        },
        {
          role: "user",
          content: userQuery
        }
      ];

      // Use Chat Completions API (gpt-4o)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: promptMessages,
        stream: true,
      });

      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const content = chunk.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
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
    }

    // --- No file attached: Use Assistant API with retrieval, fallback to Chat API if needed ---
    // Create a thread
    const thread = await openai.beta.threads.create({})
    const threadId = thread.id

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

    let foundUseful = false;
    let accumulatedContent = "";
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runStream) {
            if (
              'data' in event &&
              event.data &&
              'delta' in event.data &&
              event.data.delta &&
              'content' in event.data.delta
            ) {
              const deltaContent = (event.data.delta as any).content;
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
                // Heuristic: If the assistant says it doesn't know, mark as not useful
                if (!/don't know|not sure|no information|no data|unable to find|I do not have/i.test(content)) {
                  foundUseful = true;
                }
              }
            }
          }
          // If not useful, fallback to Chat API
          if (!foundUseful || !accumulatedContent.trim()) {
            const fallbackCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages,
              stream: true,
            });
            for await (const chunk of fallbackCompletion) {
              const content = chunk.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
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
