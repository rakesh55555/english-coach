import { useState, useEffect, useRef } from "react";

const SpeechRecognitionAPI =
  typeof window !== "undefined" 
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

export default function VoiceInput({ onResult, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (onResult) onResult(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, [onResult]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  if (!SpeechRecognitionAPI) return null;

  return (
    <button
      className={`btn-voice ${isRecording ? "recording" : ""}`}
      onClick={toggleRecording}
      disabled={disabled}
      title={isRecording ? "Stop recording" : "Speak"}
      aria-label={isRecording ? "Stop recording" : "Start voice input"}
      id="voice-input-btn"
    >
      {isRecording ? "⏹" : "🎤"}
    </button>
  );
}
