import { AssistantResponse } from "ai"
import OpenAI from "openai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    })

    // Parse the request body
    const input: {
      threadId: string | null
      message: string
    } = await req.json()

    // Create a thread if needed
    const threadId = input.threadId ?? (await openai.beta.threads.create({})).id

    // Add a message to the thread
    const createdMessage = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: input.message,
    })

    return AssistantResponse({ threadId, messageId: createdMessage.id }, async ({ forwardStream }) => {
      // Run the assistant on the thread
      const runStream = openai.beta.threads.runs.stream(threadId, {
        assistant_id: process.env.ASSISTANT_ID || "",
      })

      // Forward run status and stream message deltas
      // Forward run status and stream message deltas
      await forwardStream(runStream)
    })
  } catch (error) {
    console.error("Error in assistant API:", error)
    return new Response(JSON.stringify({ error: "Failed to process your request" }), { status: 500 })
  }
}
