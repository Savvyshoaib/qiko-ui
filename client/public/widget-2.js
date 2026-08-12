// Load marked + DOMPurify dynamically
(function loadDeps(callback) {
  const markedScript = document.createElement('script');
  markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';

  const purifyScript = document.createElement('script');
  purifyScript.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js';

  markedScript.onload = () => {
    purifyScript.onload = callback;
    document.head.appendChild(purifyScript);
  };

  document.head.appendChild(markedScript);
})(initWidget);

function initWidget() {
  marked.setOptions({
    breaks: true,
    gfm: true
  });
}


(function() {
  'use strict';

  // Get configuration from script tag
  const scriptTag = document.currentScript;
  const workerId = scriptTag?.getAttribute('data-worker-id');
  const position = scriptTag?.getAttribute('data-position') || 'bottom-right';
  const primaryColor = scriptTag?.getAttribute('data-color') || '#FFb6d4';
  const greeting = scriptTag?.getAttribute('data-greeting') || 'Hi! How can I help you today?';

  console.log("workerId", workerId)
  if (!workerId) {
    console.error('Qiko Widget: Missing data-worker-id attribute');
    return;
  }

  // Get the base URL from the script source
  // const scriptSrc = scriptTag?.src || '';
  const baseUrl = 'https://app.qiko.ai';
  //scriptSrc.replace('/widget.js', '');

  // Styles
  const styles = `
    .qiko-widget-container {
      position: fixed;
      ${position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    .qiko-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .qiko-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
    }

    .qiko-widget-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .qiko-widget-button.open svg.chat-icon {
      display: none;
    }

    .qiko-widget-button.open svg.close-icon {
      display: block;
    }

    .qiko-widget-button:not(.open) svg.chat-icon {
      display: block;
    }

    .qiko-widget-button:not(.open) svg.close-icon {
      display: none;
    }

    .qiko-widget-chat {
      position: absolute;
      ${position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
      bottom: 75px;
      width: 380px;
      height: 520px;
      background: #0f172a;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .qiko-widget-chat.open {
      display: flex;
      animation: qiko-slide-up 0.3s ease-out;
    }

    @keyframes qiko-slide-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .qiko-widget-header {
      padding: 16px;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .qiko-widget-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qiko-widget-avatar svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .qiko-widget-title {
      flex: 1;
    }

    .qiko-widget-title h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: white;
    }

    .qiko-widget-title span {
      font-size: 12px;
      color: #10b981;
    }

    .qiko-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .qiko-widget-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .qiko-widget-message.user {
      align-self: flex-end;
      background: linear-gradient(135deg, ${primaryColor} 0%, #0891b2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .qiko-widget-message.assistant {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      border-bottom-left-radius: 4px;
    }

    .qiko-widget-message.typing {
      display: flex;
      gap: 4px;
      padding: 16px 20px;
    }

    .qiko-widget-message.typing span {
      width: 8px;
      height: 8px;
      background: ${primaryColor};
      border-radius: 50%;
      animation: qiko-typing 1.4s infinite ease-in-out;
    }

    .qiko-widget-message.typing span:nth-child(1) { animation-delay: 0s; }
    .qiko-widget-message.typing span:nth-child(2) { animation-delay: 0.2s; }
    .qiko-widget-message.typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes qiko-typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    .qiko-widget-input-area {
      padding: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 8px;
    }

    .qiko-widget-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.05);
      color: white;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .qiko-widget-input::placeholder {
      color: #64748b;
    }

    .qiko-widget-input:focus {
      border-color: ${primaryColor};
    }

    .qiko-widget-send {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, #0891b2 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    .qiko-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .qiko-widget-send svg {
      width: 18px;
      height: 18px;
      fill: white;
    }

    .qiko-widget-powered {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #64748b;
    }

    .qiko-widget-powered a {
      color: ${primaryColor};
      text-decoration: none;
    }

    @media (max-width: 480px) {
      .qiko-widget-chat {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
        max-height: 600px;
      }
    }

    code {
      white-space: break-spaces;
    }
  `;

  // Create style element
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Create widget HTML
  const container = document.createElement('div');
  container.className = 'qiko-widget-container';
  container.innerHTML = `
    <div class="qiko-widget-chat">
      <div class="qiko-widget-header">
        <div class="qiko-widget-avatar">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        </div>
        <div class="qiko-widget-title">
          <h3>AI Assistant</h3>
          <span>● Online</span>
        </div>
      </div>
      <div class="qiko-widget-messages"></div>
      <div class="qiko-widget-input-area">
        <input type="text" class="qiko-widget-input" placeholder="Type your message..." />
        <button class="qiko-widget-send" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div class="qiko-widget-powered">
        Powered by <a href="https://qiko.ai" target="_blank">Qiko</a>
      </div>
    </div>
    <button class="qiko-widget-button">
      <svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      <svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
  `;

  document.body.appendChild(container);

  // Widget state
  let isOpen = false;
  let isLoading = false;
  const messages = [];
  const conversationHistory = [];

  // Elements
  const button = container.querySelector('.qiko-widget-button');
  const chat = container.querySelector('.qiko-widget-chat');
  const messagesEl = container.querySelector('.qiko-widget-messages');
  const input = container.querySelector('.qiko-widget-input');
  const sendBtn = container.querySelector('.qiko-widget-send');

  // Toggle chat
  button.addEventListener('click', () => {
    isOpen = !isOpen;
    button.classList.toggle('open', isOpen);
    chat.classList.toggle('open', isOpen);
    if (isOpen) {
      input.focus();
      // Add greeting if no messages
      if (messages.length === 0) {
        addMessage('assistant', greeting);
      }
    }
  });

  // Input handling
  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim() || isLoading;
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);


  // ===============================
  // Use this when assistant replies
  // ===============================
  function handleAssistantMessage(role, data) {
    // const markdown = data.data[0].reply;

    const dirtyHtml = marked.parse(data);
    const cleanHtml = DOMPurify.sanitize(dirtyHtml);

    addMessage(role, cleanHtml);

    conversationHistory.push({
      role: role,
      content: data // keep raw markdown
    });
  }

  function addMessage(role, content) {
    messages.push({ role, content });
    const msgEl = document.createElement('div');
    msgEl.className = `qiko-widget-message ${role}`;
    msgEl.innerHTML = content;
    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }




  function showTyping() {
    const typingEl = document.createElement('div');
    typingEl.className = 'qiko-widget-message assistant typing';
    typingEl.id = 'qiko-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const typingEl = document.getElementById('qiko-typing');
    if (typingEl) typingEl.remove();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = '';
    sendBtn.disabled = true;
    isLoading = true;

    addMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });
    showTyping();

    try {
      const response = await fetch(`${baseUrl}/api/avatar/public/${workerId}/chat`, {
        method: 'POST',
        mode: "cors",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
            user_name: workerId,
            message: text,
            // conversationHistory: conversationHistory.slice(-10),
            email:"ask@yopmail.com"
        }),
      });

      const data = await response.json().catch(() => ({}));
      hideTyping();

      if (!response.ok) {
        addMessage('assistant', 'Sorry, I couldn\'t connect to the server. Please try again later.');
        console.error('Qiko Widget API error:', response.status, data);
        return;
      }

      if (data?.data?.reply) {
        const assistantMessage = data.data.reply;
        // addMessage('assistant', assistantMessage);
        handleAssistantMessage('assistant', assistantMessage);
        conversationHistory.push({ role: 'assistant', content: assistantMessage });
      } else {
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      hideTyping();
      addMessage('assistant', 'Sorry, I couldn\'t connect. Please try again later.');
      console.error('Qiko Widget Error:', error);
    }

    isLoading = false;
    sendBtn.disabled = !input.value.trim();
  }
})();
