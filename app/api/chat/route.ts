import { OpenAI } from "openai"
import { NextResponse } from 'next/server'

// Allow responses up to 30 seconds
export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChatMessage {
  role: string
  content: string
  fileContent?: string
  file?: { fileContent?: string }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const lastMessage: ChatMessage = messages[messages.length - 1]

    // Check for explicit web search
    const webSearchKeywords = ["search web", "look online", "google it", "search it online"]
    const isWebSearch = webSearchKeywords.some(keyword =>
      lastMessage.content?.toLowerCase().includes(keyword)
    )

    if (isWebSearch) {
      return NextResponse.json({
        content: "🔍 Web search requested. (Web search is not implemented in this route. Please try again through the web search endpoint.)"
      })
    }

    // --- File-based logic ---
    if (
      lastMessage.content?.startsWith("Attached file (") &&
      lastMessage.fileContent &&
      typeof lastMessage.fileContent === "string" &&
      lastMessage.fileContent.trim().length > 0
    ) {
      let fileContent = lastMessage.fileContent || lastMessage.file?.fileContent
      const maxLength = 6000
      if (fileContent && fileContent.length > maxLength) {
        fileContent = fileContent.slice(0, maxLength) + '\n... (truncated)'
      }

      const lines = lastMessage.content.split('\n')
      const userQuery = lines.slice(1).join('\n').trim()
      const systemPrompt = `You are an AI assistant. Use ONLY the following file content to answer the user's question. Do not hallucinate. If the content is not relevant, reply exactly: "❌ No relevant data found in Rector's tool database."\n\nFile content:\n${fileContent}`

      const promptMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
      ]

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: promptMessages,
        stream: true
      })

      const encoder = new TextEncoder()
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const content = chunk.choices?.[0]?.delta?.content
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        }
      })

      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // --- Assistant API + Vector Store Logic ---
    const thread = await openai.beta.threads.create({})
    const threadId = thread.id

    for (const msg of messages) {
      await openai.beta.threads.messages.create(threadId, {
        role: msg.role,
        content: msg.content
      })
    }

    const runStream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: process.env.ASSISTANT_ID || "",
      tool_choice: "required" // This ensures only vector store is used
    })

    let accumulatedContent = ""
    const encoder = new TextEncoder()
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
              const deltaContent = (event.data.delta as any).content
              let content = ""

              if (Array.isArray(deltaContent)) {
                content = deltaContent.map((c: any) => {
                  if (c && typeof c.text === "object" && typeof c.text.value === "string") return c.text.value
                  if (typeof c.text === "string") return c.text
                  if (typeof c === "string") return c
                  return ""
                }).join("")
              } else if (typeof deltaContent === "string") {
                content = deltaContent
              }

              if (content) {
                accumulatedContent += content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            }
          }

          // If nothing matched from vector, return fallback
          if (!accumulatedContent.trim()) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "❌ No relevant data found in Rector's tool database." })}\n\n`))
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
          controller.close()
        } catch (error) {
          console.error("Error in assistant stream:", error)
          controller.error(error)
        }
      }
    })

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
