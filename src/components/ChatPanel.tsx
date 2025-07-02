import React, { useState, useEffect, useRef } from 'react';
import { ChatService, ChatMessage, ChatResponse } from '../services/chatService';

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
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    const history = await chatService.getChatHistory();
    // Convert LangChain message format to our format
    const convertedMessages: ChatMessage[] = [];
    for (let i = 0; i < history.length; i += 2) {
      if (history[i] && history[i + 1]) {
        convertedMessages.push({
          id: `user_${i}`,
          type: 'user',
          content: history[i].content,
          timestamp: Date.now() - (history.length - i) * 1000
        });
        convertedMessages.push({
          id: `assistant_${i}`,
          type: 'assistant',
          content: history[i + 1].content,
          timestamp: Date.now() - (history.length - i - 1) * 1000
        });
      }
    }
    setMessages(convertedMessages);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !backendConnected) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response: ChatResponse = await chatService.sendMessage(inputMessage);
      
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: response.output,
        timestamp: Date.now(),
        analysis: response.analysis
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    const success = await chatService.clearChatHistory();
    if (success) {
      setMessages([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const exampleQuestions = [
    "How long was I on Instagram today?",
    "What terminal commands did I use in my project?",
    "Which applications did I use the most?",
    "Show me my file editing activity",
    "What did I search for in my browser?"
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-xl font-bold">Chronicle AI Chat</h2>
          <p className="text-sm text-gray-400">Ask questions about your activity data</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            {showAnalysis ? 'Hide' : 'Show'} Analysis
          </button>
          <button
            onClick={handleClearHistory}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Clear History
          </button>
        </div>
      </div>

      {!backendConnected && (
        <div className="p-4 bg-yellow-900 border-l-4 border-yellow-500">
          <p className="text-yellow-200">
            ⚠️ Backend not connected. Please start the Chronicle backend to enable AI chat.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <h3 className="text-lg font-semibold mb-4">Welcome to Chronicle AI!</h3>
            <p className="mb-4">Ask me questions about your activity data. Here are some examples:</p>
            <div className="space-y-2">
              {exampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="block w-full text-left p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  "{question}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {message.analysis && showAnalysis && (
                <details className="mt-2 p-2 bg-gray-700 rounded">
                  <summary className="cursor-pointer text-sm text-gray-300">
                    View Analysis Data
                  </summary>
                  <pre className="mt-2 text-xs text-gray-400 overflow-x-auto">
                    {JSON.stringify(message.analysis, null, 2)}
                  </pre>
                </details>
              )}
              
              <div className="text-xs text-gray-400 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-gray-300">Chronicle AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Chronicle AI about your activities..."
            className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
            rows={2}
            disabled={!backendConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || !backendConnected}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
