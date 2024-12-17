import axios from "axios";
import fs from "fs";

export async function summarizeAudio(audioPath: string): Promise<string> {
  const modelUrl = "https://api.openai.com/v1/engines/whisper/summarize";

  const response = await axios.post(
    modelUrl,
    { audio: fs.createReadStream(audioPath) },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.outputAudioUrl;
}
