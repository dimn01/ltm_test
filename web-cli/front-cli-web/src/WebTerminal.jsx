import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

const WebTerminal = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    { type: 'system', content: 'Rainit - 우비 입은 토끼 챗봇! 🐰☔' },
    { type: 'assistant', content: '안녕! 난 우비 입은 토끼 레이닛이야! 함께 이야기해볼까? 🐰☔' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userInput = input;
    setInput('');
    setHistory(prev => [...prev, { type: 'user', content: userInput }]);
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:7071/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userInput }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      // **변경점 시작: JSON 응답을 바로 처리**
      const data = await response.json();
      const assistantResponse = data.text;

      setHistory(prev => [
        ...prev,
        { type: 'assistant', content: assistantResponse }
      ]);
      // **변경점 끝**

    } catch (error) {
      console.error('Error:', error);
      setHistory(prev => [...prev, {
        type: 'assistant',
        content: '앗, 미안해... 지금은 머리가 좀 복잡한 것 같아... 😅'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('http://localhost:7071/api/reset', {
        method: 'POST',
      });
      setHistory([
        { type: 'system', content: 'Rainit - 우비 입은 토끼 챗봇! 🐰☔' },
        { type: 'assistant', content: '안녕! 난 우비 입은 토끼 레이닛이야! 함께 이야기해볼까? 🐰☔' }
      ]);
    } catch (error) {
      console.error('Error resetting conversation:', error);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="w-full h-[600px] bg-black rounded-lg p-4 font-mono text-green-400 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <span className="text-yellow-400">Rainit Terminal</span>
        <button
          onClick={handleReset}
          className="px-2 py-1 text-sm text-yellow-400 hover:text-yellow-300"
        >
          Reset
        </button>
      </div>
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto space-y-2"
        onClick={focusInput}
      >
        {history.map((msg, idx) => (
          <div key={idx} className="flex items-start space-x-2">
            <span className="text-yellow-400">
              {msg.type === 'user' ? 'user >' : 
               msg.type === 'assistant' ? 'rainit >' :
               'system >'}
            </span>
            <span className="whitespace-pre-wrap">{msg.content}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center mt-4">
        <ChevronRight className="text-yellow-400 mr-2" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none"
          placeholder={isTyping ? "Rainit is typing..." : "Type your message..."}
          disabled={isTyping}
          autoFocus
        />
      </form>
    </div>
  );
};

export default WebTerminal;