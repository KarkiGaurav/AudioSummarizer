import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { retry } from '@/lib/utils';
import { File } from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000,
});

export async function POST(req: NextRequest) {
  console.log('Received request to /api/summarize');
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File;

    if (!audio) {
      console.error('No audio file provided');
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('Audio file received:', audio.name, 'Size:', audio.size, 'Type:', audio.type);

    // Check file size (maximum 25MB)
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large. Maximum size is 25MB.' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());

    // Create a File-like object
    const file = new File([audioBuffer], audio.name, { type: audio.type });

    // Step 1: Transcribe audio
    let transcription: string;
    try {
      console.log('Starting transcription');
      const transcriptionResponse = await retry(async () => {
        return await openai.audio.transcriptions.create({
          file: file,
          model: 'whisper-1',
        });
      }, 3);

      transcription = transcriptionResponse.text;
      console.log('Transcription completed:', transcription.slice(0, 100) + '...');
    } catch (error) {
      console.error('Transcription error:', error);
      return NextResponse.json(
        { error: 'Failed to transcribe audio. Please try again.' },
        { status: 500 }
      );
    }

    // Step 2: Summarize transcription
    try {
      console.log('Starting summarization');
      const stream = await retry(async () => {
        return await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that summarizes phone call transcripts.' },
            { role: 'user', content: `Please summarize the following phone call transcript:\n\n${transcription}` },
          ],
          stream: true,
        });
      }, 3);

      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            let completeContent = ''; 
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              console.log('Chunk content:', content); 
              completeContent += content;
              controller.enqueue(encoder.encode(content));
            }
            if (!completeContent.trim()) {
              console.error('Empty summary generated');
            }
            controller.close();
          } catch (error) {
            console.error('Stream error:', error);
            controller.error(error);
          }
        },
      });

      console.log('Summarization completed==>', customReadable);
      return new NextResponse(customReadable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch (error) {
      console.error('Summarization error:', error);
      return NextResponse.json(
        { error: 'Failed to summarize transcription. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
