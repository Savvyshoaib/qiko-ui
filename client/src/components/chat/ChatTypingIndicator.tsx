import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const loadingTexts = [
  "Thinking...",
  "Waiting...",
  "Analyzing...",
  "Generating...",
];

export default function ChatTypingIndicator() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      <div className="chat-bubble-assistant px-4 py-3 min-w-[180px]"
       style={{
              backgroundImage: "linear-gradient(90deg, #8b5cf6, #6366f1, #618287)",
              backgroundSize: "200% 100%",
              animation: "gradientShift 3s ease infinite, blink 1.5s ease-in-out infinite",
            }}
      >
        <div className="flex items-center gap-3">
          
          <Sparkles className="w-8 h-8 text-white" />
          
          <div>
            <p className="text-sm font-medium text-white">{loadingTexts[currentIndex]}</p>
            <p className="text-xs text-white">AI is processing your message</p>
          </div>
        </div>
      </div>
    </>
  );
}
