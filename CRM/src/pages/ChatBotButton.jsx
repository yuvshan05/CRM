import React,{ useState } from 'react';
import './ChatBotButton.css';

function ChatBotButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi there, enter segment name.' },
  ]);
  const [input, setInput] = useState('');
  const [conditions, setConditions] = useState([]);
  const [segmentName, setSegmentName] = useState('');
  const [step, setStep] = useState(1); 

  const toggleOpen = () => setOpen(!open);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userInput = input.trim();
    setMessages((prev) => [...prev, { from: 'user', text: userInput }]);
    setInput('');

    if (step === 1) {
      
      setSegmentName(userInput);
      setMessages((prev) => [...prev, { from: 'bot', text: `Tell me the conditions.` }]);
      setStep(2);
      return;
    }

    if (step === 2) {
      
      setMessages((prev) => [...prev, { from: 'bot', text: 'Parsing conditions...' }]);
      const loadingIndex = messages.length + 1;

      try {
        
        const nlpResponse = await fetch('https://crm-backend-y6st.onrender.com/api/segments/nlp-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userInput }),
        });

        if (!nlpResponse.ok) throw new Error('NLP parse API failed');
        const nlpData = await nlpResponse.json();

        if (nlpData.success && nlpData.conditions) {
          setConditions(nlpData.conditions);

          
          const previewResponse = await fetch('https://crm-backend-y6st.onrender.com/api/segments/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conditions: nlpData.conditions }),
          });

          if (!previewResponse.ok) throw new Error('Audience preview API failed');
          const previewData = await previewResponse.json();

          if (previewData.success && previewData.count !== undefined) {
            setMessages((prev) => {
              const withoutLoading = prev.slice(0, loadingIndex);
              return [...withoutLoading, { from: 'bot', text: `Audience size: ${previewData.count} customers.` }];
            });
            setStep(3);
          } else {
            setMessages((prev) => {
              const withoutLoading = prev.slice(0, loadingIndex);
              return [...withoutLoading, { from: 'bot', text: 'Could not get audience size.' }];
            });
          }
        } else {
          setMessages((prev) => {
            const withoutLoading = prev.slice(0, loadingIndex);
            return [...withoutLoading, { from: 'bot', text: 'Sorry, I could not parse those conditions.' }];
          });
        }
      } catch (error) {
        setMessages((prev) => {
          const withoutLoading = prev.slice(0, loadingIndex);
          return [...withoutLoading, { from: 'bot', text: `Error: ${error.message}` }];
        });
      }
      return;
    }

    if (step === 3) {
      
      try {
        const response = await fetch('https://crm-backend-y6st.onrender.com/api/segments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: segmentName, conditions }),
        });
        const data = await response.json();
    
        if (data.success) {
          setMessages((prev) => [...prev, { from: 'bot', text: 'Segment saved successfully!' }]);
          setSegmentName('');
          setConditions([]);
    
          
          if (window.location.pathname === '/segmentations') {
            setTimeout(() => {
              window.location.reload();
            }, 1000); 
          }
        } else {
          setMessages((prev) => [...prev, { from: 'bot', text: 'Error saving segment.' }]);
        }
      } catch (error) {
        setMessages((prev) => [...prev, { from: 'bot', text: `Error: ${error.message}` }]);
      }
      return;
    }
  };

  return (
    <>
      {open && (
        <div className="chatbot-popup">
          <div className="chatbot-header">
            <span>ChatBot</span>
            <button onClick={toggleOpen}>X</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chatbot-message ${msg.from === 'bot' ? 'bot' : 'user'}`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="chatbot-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}

      <button className="chatbot-toggle-btn" onClick={toggleOpen}>
        💬
      </button>
    </>
  );
}

export default ChatBotButton;
