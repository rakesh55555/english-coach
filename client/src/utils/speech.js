export function canUseSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (!canUseSpeechSynthesis()) return;
  window.speechSynthesis.cancel();
}

export function speakText(text) {
  if (!canUseSpeechSynthesis() || !text?.trim()) return false;

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
  return true;
}
