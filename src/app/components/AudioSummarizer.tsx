'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

export default function AudioSummarizer() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 25 * 1024 * 1024) {
        setError('Audio file too large. Maximum size is 25MB.');
        return;
      }
      if (!selectedFile.type.startsWith('audio/')) {
        setError('Please select a valid audio file.');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  // Submit and process the audio
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setSummary('');
    setAudioUrl(null);
    setError(null);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      // Step 1: Send file to backend for transcription and summarization
      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process audio');
      }

      // Step 2: Stream and display the summarized text
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalSummary = '';

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          const chunk = decoder.decode(value, { stream: true });
          console.log('Raw chunk from stream:', chunk);
          // const [progressStr, summaryChunk] = chunk.split(':', 2);
          // console.log('Parsed progress:', progressStr, 'Parsed summaryChunk:', summaryChunk); // Add this log

          // setProgress(parseInt(progressStr));
          // finalSummary += summaryChunk || '';
          // setSummary(finalSummary);
          // done = streamDone;

          finalSummary += chunk;
          setSummary(finalSummary); // Update summary in real-time
          done = streamDone;
        }
      }

      if (!finalSummary.trim()) {
        throw new Error('Failed to generate summary.');
      }
      // console.log('Final summary:', finalSummary); 
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: finalSummary }),
      });

      if (!ttsResponse.ok) {
        throw new Error('Failed to generate audio for the summary.');
      }

      const audioBlob = await ttsResponse.blob();
      const audioURL = URL.createObjectURL(audioBlob);
      setAudioUrl(audioURL);

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio Summarizer</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="audio-file" className="block text-sm font-medium text-gray-700 mb-2">
            Select audio file
          </label>
          <input
            id="audio-file"
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="block w-full"
          />
        </div>
        <Button type="submit" disabled={!file || isProcessing} className="w-full">
          {isProcessing ? 'Processing...' : 'Summarize Audio'}
        </Button>
      </form>

      {isProcessing && (
        <div>
          <div className="flex items-center justify-between">
            <span>Processing audio...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <div>
          <h2 className="text-xl font-semibold">Summary:</h2>
          <Textarea value={summary} readOnly className="w-full h-40" />
        </div>
      )}

      {audioUrl && (
        <div>
          <h2 className="text-xl font-semibold">Summary Audio:</h2>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
    </div>
  );
}
