import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 })
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    })

    // Call DALL-E 3 to generate the image
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    })

    if (!response.data || !response.data[0]?.url) {
      return NextResponse.json({ error: "No image URL returned from OpenAI" }, { status: 500 })
    }

    const imageUrl = response.data[0].url
    return NextResponse.json({ url: imageUrl }, { status: 200 })
  } catch (error) {
    console.error("Error in image API:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
