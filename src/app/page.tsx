import AudioSummarizer from './components/AudioSummarizer'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio Call Summarizer</h1>
      <AudioSummarizer />
    </main>
  )
}

