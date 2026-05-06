import type { SpeechToTextConvertRequestModelId } from "@elevenlabs/elevenlabs-js/api/resources/speechToText/types/SpeechToTextConvertRequestModelId";

/** ElevenLabs Speech-to-Text 的 model_id；未设置时与原先硬编码一致。 */
export function getElevenLabsSpeechToTextModelId(): SpeechToTextConvertRequestModelId {
  const id = process.env.ELEVENLABS_SPEECH_TO_TEXT_MODEL?.trim();
  return (id || "eleven_flash_v2_5") as SpeechToTextConvertRequestModelId;
}
