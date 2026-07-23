import AddisAI, { fileFromPath, type ChatCompletionMessage } from 'addisai';

const addis = new AddisAI({ timeout: 30_000, maxRetries: 2 });

async function verifyPublishedNodeSurface() {
  const messages: ChatCompletionMessage[] = [
    { role: 'user', content: 'Maqaan kee eenyu?' },
  ];
  const firstTurn = await addis.chat.completions.create({ messages });
  messages.push(firstTurn.choices[0].message);
  messages.push({ role: 'user', content: 'Deebii gabaabaa kenni.' });

  const chat = await addis.chat.completions.create({
    language: 'am',
    system: 'Be concise.',
    persona: 'You are a documentation tester.',
    messages: [{ role: 'user', content: 'ሰላም' }],
  });
  console.log(chat.choices[0].message.content);

  const stream = await addis.chat.completions.create({
    language: 'am',
    messages: [{ role: 'user', content: 'ሰላም' }],
    stream: true,
  });
  for await (const event of stream) console.log(event.choices[0]?.delta?.content ?? '');

  await addis.chat.completions.create({
    language: 'am',
    messages: [{ role: 'user', content: 'Describe this image.' }],
    attachments: [{ file: await fileFromPath('image.png', 'image/png') }],
  });

  const input = {
    voiceId: 'am-hamen',
    text: 'ሰላም',
    language: 'am' as const,
    outputFormat: 'mp3_44100' as const,
  };
  const estimate = await addis.voice.estimate(input);
  if (estimate.canGenerate) {
    const clip = await addis.voice.generate({ ...input, clientRequestId: 'typecheck-operation' });
    await clip.toFile('speech.mp3');
  }

  const voices = await addis.voices.list({ language: 'am' });
  const preview = await addis.voices.preview(voices[0]?.id ?? 'am-hamen');
  console.log(preview.audioUrl);

  const transcription = await addis.speech.transcribe({
    audio: await fileFromPath('speech.mp3', 'audio/mpeg'),
    language: 'am',
  });
  console.log(transcription.text);

  const translation = await addis.translate.create({ text: 'Hello', from: 'en', to: 'am' });
  console.log(translation.text);

  const legacyAudio = await addis.legacy.audio.generate({
    text: 'ሰላም',
    language: 'am',
  });
  await legacyAudio.toFile('legacy-speech.wav');

  const legacyStream = await addis.legacy.audio.stream({
    text: 'ረጅም ጽሑፍ',
    language: 'am',
  });
  for await (const chunk of legacyStream) console.log(chunk.byteLength);

  const tools = [{
    type: 'function' as const,
    function: {
      name: 'get_weather',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    },
  }];
  const first = await addis.chat.completions.create({
    messages: [{ role: 'user', content: 'Use get_weather.' }],
    tools,
    tool_choice: 'required',
  });
  console.log(first.choices[0].message.tool_calls?.[0]?.function.name);
}

void verifyPublishedNodeSurface;
