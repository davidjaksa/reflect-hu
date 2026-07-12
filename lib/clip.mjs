import { AutoProcessor, AutoTokenizer, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage } from '@huggingface/transformers'

const modelId = process.env.CLIP_MODEL ?? 'Xenova/clip-vit-base-patch32'
let visionPromise
let textPromise
let processorPromise
let tokenizerPromise

function normalized(values) {
  const vector = Array.from(values, Number)
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

export async function imageEmbedding(imagePath) {
  visionPromise ??= CLIPVisionModelWithProjection.from_pretrained(modelId)
  processorPromise ??= AutoProcessor.from_pretrained(modelId)
  const [model, processor, image] = await Promise.all([visionPromise, processorPromise, RawImage.read(imagePath)])
  const inputs = await processor(image)
  const output = await model(inputs)
  return normalized(output.image_embeds.data)
}

export async function textEmbedding(text) {
  textPromise ??= CLIPTextModelWithProjection.from_pretrained(modelId)
  tokenizerPromise ??= AutoTokenizer.from_pretrained(modelId)
  const [model, tokenizer] = await Promise.all([textPromise, tokenizerPromise])
  const inputs = tokenizer([text], { padding: true, truncation: true })
  const output = await model(inputs)
  return normalized(output.text_embeds.data)
}

export function pgVector(vector) {
  return `[${vector.join(',')}]`
}
