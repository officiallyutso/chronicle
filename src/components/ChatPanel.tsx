import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChatService, ChatMessage, ChatResponse } from '../services/chatService';
import { Loader2, RocketIcon } from 'lucide-react';

interface ChatPanelProps {
  backendConnected: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ backendConnected }) => {
  const [chatService] = useState(() => new ChatService());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (backendConnected) loadChatHistory();
  }, [backendConnected]);

  const loadChatHistory = async () => {
    const history = await chatService.getChatHistory();
    const recent = history.slice(-6);
    const converted: ChatMessage[] = [];
    for (let i = 0; i < recent.length; i += 2) {
      if (recent[i] && recent[i + 1]) {
        converted.push({
          id: `user_${Date.now()}_${i}`,
          type: 'user',
          content: recent[i].content,
          timestamp: Date.now() - (recent.length - i) * 1000,
        });
        converted.push({
          id: `assistant_${Date.now()}_${i}`,
          type: 'assistant',
          content: recent[i + 1].content,
          timestamp: Date.now() - (recent.length - i - 1) * 1000,
        });
      }
    }
    setMessages(converted);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !backendConnected) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response: ChatResponse = await chatService.sendMessage(inputMessage);
      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: response.output,
        timestamp: Date.now(),
        analysis: response.analysis,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          type: 'assistant',
          content: '⚠️ Oops! Something went wrong. Try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = async () => {
    const cleared = await chatService.clearChatHistory();
    if (cleared) setMessages([]);
  };

  const exampleQuestions = [
    'How long was I on Instagram today?',
    'What terminal commands did I use in my project?',
    'Which applications did I use the most?',
    'Show me my file editing activity',
    'What did I search for in my browser?',
  ];

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 font-sans relative">
      {/* HEADER */}
      <header className="flex justify-between items-center px-6 py-4 bg-white shadow-md z-10">
        <div className="flex items-center gap-2">
          <img src="src/assets/Chronicle.png" alt="Chronicle Logo" className="w-20 h-20" />
          <div>
            <h1 className="text-2xl font-bold text-[#00B5D8]">Chronicle AI</h1>
            <p className="text-xs text-gray-500">Ask anything about your digital life</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="bg-[#00B5D8] text-white text-sm px-4 py-1.5 rounded-lg hover:bg-[#00A2C4] transition shadow-sm"
          >
            {showAnalysis ? 'Hide' : 'Show'} Analysis
          </button>
          <button
            onClick={handleClearHistory}
            className="bg-red-500 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-red-600 transition shadow-sm"
          >
            Clear
          </button>
        </div>
      </header>

      {/* WARNING */}
      {!backendConnected && (
        <div className="p-4 bg-yellow-100 text-yellow-800 border-l-4 border-yellow-400 text-sm">
          ⚠️ Backend not connected. Please start the Chronicle backend.
        </div>
      )}

      {/* CHAT BODY */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-28">
        {messages.length === 0 && (
          <div className="text-center text-gray-400">
            <RocketIcon size={32} className="mx-auto mb-2 text-[#00B5D8]" />
            <p className="text-md mb-2">Ask Chronicle something like:</p>
            <div className="grid gap-2 max-w-md mx-auto">
              {exampleQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInputMessage(q)}
                  className="text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm"
                >
                  “{q}”
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CHAT BUBBLES */}
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xl px-5 py-3 rounded-2xl border backdrop-blur-sm shadow-md text-sm ${
                msg.type === 'user'
                  ? 'bg-[#d9f5fc] text-[#007a96] border-[#bdeef6]'
                  : 'bg-white text-gray-800 border-gray-200'
              }`}
            >
              <div>{msg.content}</div>
              {msg.analysis && showAnalysis && (
                <details className="mt-2 text-xs text-gray-500">
                  <summary className="cursor-pointer font-semibold">View Analysis</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(msg.analysis, null, 2)}</pre>
                </details>
              )}
              <div className="text-[10px] text-gray-400 mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        ))}

        {/* LOADING TYPING EFFECT */}
        {isLoading && (
          <div className="flex justify-start">
            <motion.div
              className="px-4 py-2 rounded-xl bg-gray-100 border border-gray-200 text-sm text-gray-500 shadow-sm flex items-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex space-x-1 animate-bounce">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              </div>
              <span>Chronicle is thinking...</span>
            </motion.div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* FLOATING INPUT BAR */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-10">
        <div className="flex items-end space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            placeholder="Ask Chronicle AI about your digital activity..."
            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[#00B5D8] bg-white shadow-sm"
            disabled={!backendConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || !backendConnected}
            className="px-5 py-2 rounded-2xl bg-[#00B5D8] hover:bg-[#00A2C4] text-white text-sm shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
};
