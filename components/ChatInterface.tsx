
import React, { useState, useRef, useEffect } from 'react';
// FIX: Import types for docx library to resolve TypeScript errors when using dynamic import.
import type { Paragraph, TextRun } from 'docx';
import { Message, CitationStyle, Language } from '../types';
import { CITATION_STYLES, LANGUAGES } from '../constants';
import { generateContent } from '../services/geminiService';
import { FileTextIcon, SendIcon, DownloadIcon, DocxIcon, SpinnerIcon } from './icons';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [docxLoading, setDocxLoading] = useState<boolean>(false);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(CitationStyle.IEEE);
  const [language, setLanguage] = useState<Language>(Language.English);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, loading]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await generateContent(input, messages, citationStyle, language);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
       setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSendMessage();
    }
  };
  
  const handleExportChat = () => {
      if (messages.length === 0) return;

      const fileContent = messages.map(msg => {
        const prefix = msg.role === 'user' ? 'User' : 'AutoPaper Pro';
        const cleanContent = msg.content.replace(/<sup>(\d+)<\/sup>/g, '^$1').replace(/<br \/>/g, '\n');
        return `${prefix}:\n${cleanContent}\n\n`;
      }).join('');

      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `autopaper-chat-${timestamp}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

  const handleExportDocx = async () => {
    if (messages.length === 0) return;

    setDocxLoading(true);
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const { saveAs } = await import('file-saver');

      const docChildren: Paragraph[] = [];

      messages.forEach((msg, index) => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: msg.role === 'user' ? 'User:' : 'AutoPaper Pro:',
                bold: true,
              }),
            ],
            spacing: { after: 120 },
          })
        );

        const contentLines = msg.content.split('\n');
        contentLines.forEach(line => {
          if (line.trim() === '') {
            docChildren.push(new Paragraph({ text: '' }));
            return;
          }

          const lineParts: TextRun[] = [];
          const segments = line.split(/(\^\d+)/);

          segments.forEach(segment => {
            if (!segment) return;
            if (segment.startsWith('^')) {
              lineParts.push(new TextRun({ text: segment.substring(1), superScript: true }));
            } else {
              lineParts.push(new TextRun({ text: segment }));
            }
          });
          
          if (lineParts.length > 0) {
            docChildren.push(new Paragraph({ children: lineParts }));
          }
        });
        
        if (index < messages.length - 1) {
          docChildren.push(new Paragraph({ text: '', spacing: { after: 240 } }));
        }
      });

      const doc = new Document({
        sections: [{ children: docChildren }],
      });

      const blob = await Packer.toBlob(doc);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(blob, `autopaper-chat-${timestamp}.docx`);

    } catch (err) {
      console.error("Failed to export DOCX", err);
      alert("Failed to export DOCX. Check the console for more details.");
    } finally {
      setDocxLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    const formattedContent = content
      .replace(/\^(\d+)/g, '<sup>$1</sup>')
      .replace(/\n/g, '<br />');
    return { __html: formattedContent };
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-2 sm:p-4 bg-white shadow-lg rounded-lg">
      <header className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileTextIcon className="w-7 h-7 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">AutoPaper Pro</h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <select 
            value={citationStyle}
            onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
            className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CITATION_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
          </select>
          
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </select>
          <button
            onClick={handleExportChat}
            disabled={messages.length === 0}
            className="p-2 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export chat history as text file"
            title="Export as TXT"
          >
            <DownloadIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleExportDocx}
            disabled={messages.length === 0 || docxLoading}
            className="p-2 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export chat history as DOCX file"
            title="Export as DOCX"
          >
            {docxLoading ? <SpinnerIcon className="w-5 h-5" /> : <DocxIcon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto mb-4 p-2 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
            <FileTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold mb-2">Start Your Academic Writing</h2>
            <p className="max-w-md">Ask me to help with outlines, drafts, citations, or checking your arguments. For example, try: "Help me write an introduction about AI in education with IEEE citations"</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xl md:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div 
                  className="prose-styles"
                  dangerouslySetInnerHTML={renderMessageContent(msg.content)} 
                />
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Thinking</span>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}/>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}/>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 sm:gap-4 p-2 border-t border-gray-200">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask for help with your academic writing..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-shadow"
          disabled={loading}
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !input.trim()}
          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          aria-label="Send message"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </div>

      <footer className="text-center text-xs text-gray-400 mt-2 px-4">
        ⚠️ Always verify sources and disclose AI assistance according to your institution's academic integrity policies.
      </footer>
       <style>{`
        .prose-styles sup {
          line-height: 0;
        }
      `}</style>
    </div>
  );
}

export default ChatInterface;
