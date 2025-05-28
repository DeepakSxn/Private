import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { imageBase64, userQuery } = await req.json();

    if (!imageBase64 || !userQuery) {
      return NextResponse.json(
        { error: 'Missing required fields: imageBase64 and userQuery' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: userQuery },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        max_tokens: 500
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new Error('No response from OpenAI');
      }

      return NextResponse.json({ result: response.choices[0].message.content });
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      return NextResponse.json(
        { error: openaiError.message || 'Failed to process image with OpenAI' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Vision API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process image' },
      { status: 500 }
    );
  }
} 