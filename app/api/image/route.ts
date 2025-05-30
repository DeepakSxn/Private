import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

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

    const dalleUrl = response.data[0].url;
    // Download the image from DALL·E
    const imageRes = await fetch(dalleUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `dalle-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, buffer, {
        cacheControl: '31536000',
        upsert: false,
        contentType: 'image/png',
      });
    if (uploadError) {
      console.error('[image API] Supabase upload error:', uploadError.message, uploadError);
      return NextResponse.json({ error: uploadError.message, details: uploadError }, { status: 500 });
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);
    if (!publicUrlData.publicUrl) {
      console.error('[image API] Supabase getPublicUrl error: No public URL found');
      return NextResponse.json({ error: 'No public URL found' }, { status: 500 });
    }
    return NextResponse.json({ url: publicUrlData.publicUrl }, { status: 200 });
  } catch (error) {
    console.error("Error in image API:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
