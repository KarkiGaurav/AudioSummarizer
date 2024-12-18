import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    console.log("text-===>", text)
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // Choose from: alloy, echo, fable, onyx, shimmer
      input: text,
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio.' }, { status: 500 });
  }
}
