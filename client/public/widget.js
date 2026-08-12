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


(function () {
  'use strict';

  // Get configuration from script tag
  const scriptTag = document.currentScript;
  const workerId = scriptTag?.getAttribute('data-worker-id');
  // const laravelDecryptKey = scriptTag?.getAttribute('data-laravel-decrypt-key') || '';
  const position = scriptTag?.getAttribute('data-position') || 'bottom-right';
  const primaryColor = scriptTag?.getAttribute('data-color') || '#FFb6d4';
  const greeting = scriptTag?.getAttribute('data-greeting') || 'Hi! How can I help you today?';
  const userInfoStorageKey = `qiko_widget_user_info_${workerId}`;
  const userNameStorageKey = `qiko_widget_user_name_${workerId}`;

  console.log("workerId", workerId)
  if (!workerId) {
    console.error('Qiko Widget: Missing data-worker-id attribute');
    return;
  }

  // Get the base URL from the script source
  // const scriptSrc = scriptTag?.src || '';
  const baseUrl = 'https://app.qiko.ai';
  const apiBaseUrl = 'https://backend.qiko.ai';
  //scriptSrc.replace('/widget.js', '');

  // -----------------------------------------
  // Vapi + Laravel decryption helpers
  // -----------------------------------------
  // function normalizeKey(key) {
  //   return key && key.startsWith('base64:') ? key.slice(7) : key;
  // }

  // function base64ToBytes(base64) {
  //   const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  //   const binary = atob(normalized);
  //   const bytes = new Uint8Array(binary.length);
  //   for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  //   return bytes;
  // }

  // function parsePayload(encrypted) {
  //   try {
  //     const decoded = atob(encrypted.replace(/-/g, '+').replace(/_/g, '/'));
  //     const json = JSON.parse(decoded);
  //     if (!json || !json.iv || !json.value || !json.mac) throw new Error('Invalid payload');
  //     return json;
  //   } catch {
  //     throw new Error('Invalid Laravel encrypted string');
  //   }
  // }

  // async function hmacSha256Hex(messageBytes, keyBytes) {
  //   const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  //   const sig = await crypto.subtle.sign('HMAC', key, messageBytes);
  //   return Array.from(new Uint8Array(sig))
  //     .map((b) => b.toString(16).padStart(2, '0'))
  //     .join('');
  // }

  // function safeCompare(a, b) {
  //   if (!a || !b || a.length !== b.length) return false;
  //   let result = 0;
  //   for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  //   return result === 0;
  // }

  // async function decryptLaravel(encrypted, keyBase64) {
  //   const cleanKey = normalizeKey(keyBase64);
  //   const keyBytes = base64ToBytes(cleanKey);
  //   if (keyBytes.length !== 32) throw new Error('Invalid key length (must be 32 bytes)');

  //   const payload = parsePayload(encrypted);
  //   const ivBytes = base64ToBytes(payload.iv);
  //   const valueBytes = base64ToBytes(payload.value);

  //   const macMessage = new TextEncoder().encode(payload.iv + payload.value);
  //   const expectedMac = await hmacSha256Hex(macMessage, keyBytes);
  //   if (!safeCompare(expectedMac, String(payload.mac).toLowerCase())) {
  //     throw new Error('Decrypt failed: invalid MAC');
  //   }

  //   const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
  //   const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBytes }, cryptoKey, valueBytes);
  //   return new TextDecoder().decode(decrypted);
  // }

  async function getVapiClass() {
    if (window.Vapi) return window.Vapi;
    if (!window.__qikoVapiLoading) {
      // Use an ESM CDN so we can import the SDK from a static widget script.
      window.__qikoVapiLoading = import('https://esm.sh/@vapi-ai/web@2.5.2').then((mod) => mod.default || mod);
    }
    window.Vapi = await window.__qikoVapiLoading;
    return window.Vapi;
  }

  function extractVapiErrorMessage(error) {
    let erroMsg = error?.error?.message?.message;
    if (!error) return "Voice call error";
    if (typeof error === "string") return error;
    if (typeof error.message === "string" && error.message.trim()) return error.message;
    if (typeof error?.message?.message === "string" && error.message.message.trim()) return error.message.message;
    if (typeof error.error?.message === "string" && error.error.message.trim()) return error.error.message;
    if (typeof error.error?.statusMessage === "string" && error.error.statusMessage.trim()) return error.error.statusMessage;
    if (typeof error.errorMessage === "string" && error.errorMessage.trim()) return error.errorMessage;
    if (typeof error.msg === "string" && error.msg.trim()) return error.msg;
    if (error.action === "meeting-left" || error.action === "left-meeting") return "Call session ended";
    try {
      // const str = JSON.stringify(error);
      
      console.log("[Vapi] Unstructured error object:", erroMsg);
    } catch (_) {}
    return erroMsg.trim();
  }

  // Styles
  const styles = `

  .qiko-widget-container-onboarding {
     width: 100%;
    max-width: 380px;
    margin: auto;
    position: absolute;
    left: 0;
    top: 75px;
}
.hideWidgetInputArea {
  display: none !important;
}
  
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

    .qiko-call-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      position: absolute;
      bottom: 90px;
      ${position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
    }

    .qiko-call-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
    }

    .qiko-call-button svg {
      width: 28px;
      height: 28px;
      fill: white;
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

    .qiko-widget-input-area.hideWidgetInputArea {
      display: none;
    }

    .qiko-widget-input {
      flex: 1 !important;
      padding: 12px 16px !important;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px !important;
      background: rgba(255, 255, 255, 0.05) !important;
      color: white !important;
      font-size: 14px !important;
      outline: none;
      transition: border-color 0.2s;
    }

    .qiko-widget-input::placeholder {
      color: #64748b !important;
    }

    .qiko-widget-input:focus {
      border-color: ${primaryColor} !important;
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

    .qiko-widget-user-form {
      padding: 16px;
      display: none;
      flex-direction: column;
      gap: 10px;
    }

    .qiko-widget-user-form.open {
      display: flex;
      justify-content: center;
    height: 415px;
    }

    .qiko-widget-user-form-title {
     margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    padding-right: 55px;
    padding-bottom: 20px;
    }

    .qiko-widget-user-form-row {
      display: flex;
      gap: 10px;
      flex-direction: column;
    }

    .qiko-widget-user-form-row > * {
      flex: 1;
    }

    .qiko-widget-user-form input {
      padding: 15px 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      color: white;
      font-size: 13px;
      outline: none;
    }

    .qiko-widget-user-form input::placeholder {
      color: #64748b;
    }

    .qiko-widget-user-form input:focus {
      border-color: ${primaryColor};
    }

    /* Show required-field errors when host pages prevent native form submission */
    .qiko-widget-user-form input.qiko-field-invalid {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }

    .qiko-widget-user-form-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 65px;
    }

    .qiko-widget-user-form-actions .qiko-widget-submit-btn {
      padding: 14px 14px;
    border-radius: 10px;
    background: linear-gradient(135deg, #FFb6d4 0%, #8b5cf6 100%);
    border: none;
    cursor: pointer;
    color: white;
    font-size: 18px;
    font-weight: 600;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    @media (max-width: 480px) {
      .qiko-widget-chat,
      .qiko-call-ui {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
        max-height: 600px;
      }
    }

    code {
      white-space: break-spaces;
    }

    .qiko-call-ui {
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

    .qiko-call-ui.open {
      display: flex;
      animation: qiko-slide-up 0.3s ease-out;
    }

    .qiko-call-video-area {
      flex: 1;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .qiko-call-iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      display: none;
      z-index: 0;
    }

    .qiko-call-avatar {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      animation: qiko-pulse 2s infinite;
      position: relative;
      z-index: 1;
      pointer-events: none;
    }

    @keyframes qiko-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }

    .qiko-call-avatar svg {
      width: 80px;
      height: 80px;
      fill: white;
    }

    .qiko-call-info {
      text-align: center;
      color: white;
      position: relative;
      z-index: 1;
      pointer-events: none;
    }

    .qiko-call-info h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .qiko-call-info span {
      font-size: 14px;
      color: #10b981;
    }

    .qiko-call-controls {
      padding: 20px;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: center;
      gap: 20px;
    }

    .qiko-call-control-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .qiko-call-control-btn svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    .qiko-call-mute {
      background: rgba(255, 255, 255, 0.2);
    }

    .qiko-call-mute:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .qiko-call-mute.muted {
      background: #ef4444;
    }

    .qiko-call-chat {
      background: rgba(255, 255, 255, 0.2);
    }

    .qiko-call-chat:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .qiko-call-end {
      background: #ef4444;
    }

    .qiko-call-end:hover {
      background: #dc2626;
    }

    .qiko-call-chat-panel {
      position: absolute;
      bottom: 90px;
      left: 0;
      right: 0;
      height: 200px;
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: none;
      flex-direction: column;
      backdrop-filter: blur(10px);
    }

    .qiko-call-chat-panel.open {
      display: flex;
    }

    .qiko-call-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .qiko-input {
    color: white !important;
    background: rgb(255 255 255 / 5%) !important;
  }

  .qiko-input::placeholder {
    color: rgba(255, 255, 255, 0.7) !important;
  }

  .qiko-input:focus {
    color: white !important;
    outline: none;
  }

  .qiko-input:focus::placeholder {
    color: rgba(255, 255, 255, 0.5) !important;
  }

    .qiko-call-message {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.4;
    }

    .qiko-call-message.user {
      align-self: flex-end;
      background: linear-gradient(135deg, ${primaryColor} 0%, #0891b2 100%);
      color: white;
    }

    .qiko-call-message.assistant {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
    }

    .qiko-call-input-area {
      padding: 8px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 8px;
    }

    .qiko-call-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.05);
      color: white;
      font-size: 13px;
      outline: none;
    }

    .qiko-call-send {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, #0891b2 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qiko-call-send svg {
      width: 14px;
      height: 14px;
      fill: white;
    }

    @media (max-width: 480px) {
      .qiko-widget-chat,
      .qiko-call-ui {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
        max-height: 600px;
      }
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
    
    <div class="qiko-widget-container-onboarding">
  <form class="qiko-widget-user-form" id="qiko-user-form">
    
    <p class="qiko-widget-user-form-title">Start a conversation and get the help you need</p>

    <div class="qiko-widget-user-form-row">
      <input type="text" id="qiko-user-name" class="qiko-input" placeholder="Name" required />
      <input type="email" id="qiko-user-email" class="qiko-input" placeholder="Email" required />
      <input type="tel" id="qiko-user-phone" class="qiko-input" placeholder="Phone (optional)" />
    </div>

    

    <div class="qiko-widget-user-form-actions">
      <button type="button" class="qiko-widget-submit-btn" style="display: flex; align-items: center; justify-content: center;" >Chat Now</button>
    </div>

  </form>
</div>


      <div class="qiko-widget-header">
        <div class="qiko-widget-avatar">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        </div>
        <div class="qiko-widget-title">
          <h3>AI Assistant</h3>
          <span>● Online</span>
        </div>
        <div class="qiko-widget-title" style="text-align: right;">
          <span style="cursor: pointer;" id="start-call-btn">
          <svg style="fill: #8b5cf6;" width="30" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 122.88 122.27" style="enable-background:new 0 0 122.88 122.27" xml:space="preserve"><g><path d="M33.84,50.25c4.13,7.45,8.89,14.6,15.07,21.12c6.2,6.56,13.91,12.53,23.89,17.63c0.74,0.36,1.44,0.36,2.07,0.11 c0.95-0.36,1.92-1.15,2.87-2.1c0.74-0.74,1.66-1.92,2.62-3.21c3.84-5.05,8.59-11.32,15.3-8.18c0.15,0.07,0.26,0.15,0.41,0.21 l22.38,12.87c0.07,0.04,0.15,0.11,0.21,0.15c2.95,2.03,4.17,5.16,4.2,8.71c0,3.61-1.33,7.67-3.28,11.1 c-2.58,4.53-6.38,7.53-10.76,9.51c-4.17,1.92-8.81,2.95-13.27,3.61c-7,1.03-13.56,0.37-20.27-1.69 c-6.56-2.03-13.17-5.38-20.39-9.84l-0.53-0.34c-3.31-2.07-6.89-4.28-10.4-6.89C31.12,93.32,18.03,79.31,9.5,63.89 C2.35,50.95-1.55,36.98,0.58,23.67c1.18-7.3,4.31-13.94,9.77-18.32c4.76-3.84,11.17-5.94,19.47-5.2c0.95,0.07,1.8,0.62,2.25,1.44 l14.35,24.26c2.1,2.72,2.36,5.42,1.21,8.12c-0.95,2.21-2.87,4.25-5.49,6.15c-0.77,0.66-1.69,1.33-2.66,2.03 c-3.21,2.33-6.86,5.02-5.61,8.18L33.84,50.25L33.84,50.25L33.84,50.25z"/></g></svg>
          </span>
        </div>
      </div>
   
      <div class="qiko-widget-messages"></div>
      <div class="qiko-widget-input-area" id="widget-inputArea">
        <input type="text" class="qiko-widget-input" style="color: white !important;" placeholder="Type your message..." />
        <button class="qiko-widget-send" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div style="text-align:center; padding: 8px; display: none;">
        <button id="qiko-print-btn" style="
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          color: white;
          font-size: 12px;
        ">
          🖨️ Print Chat
        </button>
      </div>
      <div class="qiko-widget-powered">
        Powered by <a href="https://qiko.ai" target="_blank">Qiko</a>
      </div>
    </div>
    
    <div class="qiko-call-ui">
      <div class="qiko-call-video-area">
        <iframe
          id="qiko-vapi-iframe"
          class="qiko-call-iframe"
          title="Vapi voice call"
          allow="microphone; autoplay"
        ></iframe>
        <div class="qiko-call-avatar" id="call-avatar">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        </div>
        <div class="qiko-call-info">
          <h3 style="color: white !important;">AI Assistant</h3>
          <span id="call-status" style="color: white !important;">● Connecting...</span>
        </div>
        <div class="qiko-call-chat-panel" id="call-chat-panel">
          <div class="qiko-call-messages" id="call-messages"></div>
          <div class="qiko-call-input-area">
            <input type="text" class="qiko-call-input" id="call-input" placeholder="Type message during call..." />
            <button class="qiko-call-send" id="call-send">
              <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="qiko-call-controls">
        <button class="qiko-call-control-btn qiko-call-mute" id="call-mute">
          <svg viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
        </button>
       
        <button class="qiko-call-control-btn qiko-call-end" id="call-end">
          <svg viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.57.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
        </button>
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
  let isInCall = false;
  let isMuted = false;
  let localStream = null;
  let remoteStream = null;
  let peerConnection = null;
  let vapiInstance = null;
  const callMessages = [];
  let lastChatErrorMessage = '';
  let lastChatErrorAt = 0;

  // Elements
  const printBtn = container.querySelector('#qiko-print-btn');
  const button = container.querySelector('.qiko-widget-button');
  const chat = container.querySelector('.qiko-widget-chat');
  const messagesEl = container.querySelector('.qiko-widget-messages');
  const widgetInputArea = container.querySelector('#widget-inputArea');
  const input = container.querySelector('.qiko-widget-input');
  const sendBtn = container.querySelector('.qiko-widget-send');
  const userForm = container.querySelector('#qiko-user-form');
  const userNameInput = container.querySelector('#qiko-user-name');
  const userEmailInput = container.querySelector('#qiko-user-email');
  const userPhoneInput = container.querySelector('#qiko-user-phone');
  const userFormSubmit = container.querySelector('.qiko-widget-user-form-actions .qiko-widget-submit-btn');

  // Call elements
  const callUI = container.querySelector('.qiko-call-ui');
  const startCallBtn = container.querySelector('#start-call-btn');
  const callMuteBtn = container.querySelector('#call-mute');
  const callChatBtn = container.querySelector('#call-chat-toggle');
  const callEndBtn = container.querySelector('#call-end');
  const callStatus = container.querySelector('#call-status');
  const callAvatar = container.querySelector('#call-avatar');
  const callChatPanel = container.querySelector('#call-chat-panel');
  const callMessagesEl = container.querySelector('#call-messages');
  const callInput = container.querySelector('#call-input');
  const callSendBtn = container.querySelector('#call-send');
  const callIframe = container.querySelector('#qiko-vapi-iframe');

  clearStoredUserInfoOnReload();
  renderUserFormFromStorage();
  updateInteractionLocks();

  function printConversation() {
    if (!messages.length) {
      alert('No conversation to print');
      return;
    }
  
    let html = `
      <html>
        <head>
          <title>Chat Conversation</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #fff;
              color: #000;
            }
              
            .msg {
              margin-bottom: 12px;
              padding: 10px;
              border-radius: 10px;
              max-width: 80%;
            }
            .user {
              background: #e0f2fe;
              margin-left: auto;
              text-align: right;
            }
            .assistant {
              background: #f1f5f9;
              margin-right: auto;
            }
            .label {
              font-weight: bold;
              margin-bottom: 4px;
              display: block;
            }
          </style>
        </head>
        <body>
          <h2>Chat Conversation</h2>
    `;
  
    messages.forEach(msg => {
      html += `
        <div class="msg ${msg.role}">
          <span class="label">${msg.role === 'user' ? 'You' : 'Assistant'}</span>
          <div>${msg.content}</div>
        </div>
      `;
    });
  
    html += `</body></html>`;
  
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  if (printBtn) {
    printBtn.addEventListener('click', printConversation);
  }

  function submitUserInfoAndContinue() {
    // Clear previous validation state
    userNameInput?.classList.remove("qiko-field-invalid");
    userEmailInput?.classList.remove("qiko-field-invalid");
    userNameInput?.setAttribute("aria-invalid", "false");
    userEmailInput?.setAttribute("aria-invalid", "false");

    const info = {
      name: (userNameInput?.value || '').trim(),
      email: (userEmailInput?.value || '').trim(),
      phone: (userPhoneInput?.value || '').trim(),
    };

    const nameOk = !!info.name;
    const emailOk = !!info.email;

    if (!nameOk || !emailOk) {
      if (!nameOk && userNameInput) {
        userNameInput.classList.add("qiko-field-invalid");
        userNameInput.setAttribute("aria-invalid", "true");
        // Trigger native validity UI if available
        if (typeof userNameInput.reportValidity === "function") {
          userNameInput.reportValidity();
        }
        userNameInput.focus();
      } else if (!emailOk && userEmailInput) {
        userEmailInput.classList.add("qiko-field-invalid");
        userEmailInput.setAttribute("aria-invalid", "true");
        if (typeof userEmailInput.reportValidity === "function") {
          userEmailInput.reportValidity();
        }
        userEmailInput.focus();
      }
      return false;
    }

    sessionStorage.setItem(userInfoStorageKey, JSON.stringify(info));
    userForm?.classList.remove('open');
    widgetInputArea?.classList.remove('hideWidgetInputArea');
    updateInteractionLocks();

    if (messages.length === 0) {
      addMessage('assistant', greeting);
    }
    input?.focus();
    return true;
  }

  if (userForm) {
    userForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitUserInfoAndContinue();
    });

    // Delegated handler: survives host-page DOM mutations (Elementor/WordPress).
    userForm.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const submitTrigger = target.closest('[data-qiko-submit="true"]');
      if (!submitTrigger) return;
      e.preventDefault();
      submitUserInfoAndContinue();
    });

    userForm.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const target = e.target;
      if (target === userPhoneInput) return;
      e.preventDefault();
      submitUserInfoAndContinue();
    });
  }

  // Clear red error state as user types
  userNameInput?.addEventListener("input", () => {
    userNameInput.classList.remove("qiko-field-invalid");
    userNameInput.setAttribute("aria-invalid", "false");
  });
  userEmailInput?.addEventListener("input", () => {
    userEmailInput.classList.remove("qiko-field-invalid");
    userEmailInput.setAttribute("aria-invalid", "false");
  });

  // Primary click handler so host-page plugins cannot break submit behavior.
  if (userFormSubmit) {
    userFormSubmit.addEventListener('click', (e) => {
      e.preventDefault();
      submitUserInfoAndContinue();
    });
  }

  // Toggle chat
  button.addEventListener('click', () => {
    if (isInCall) {
      // If in call, only close the call UI, don't toggle
      if (isOpen) {
        callUI.classList.remove('open');
        button.classList.remove('open');
        isOpen = false;
      } else {
        callUI.classList.add('open');
        button.classList.add('open');
        isOpen = true;
      }
    } else {
      isOpen = !isOpen;
      button.classList.toggle('open', isOpen);
      chat.classList.toggle('open', isOpen);
      if (isOpen) {
        updateInteractionLocks();
        if (hasUserInfo()) {
          input.focus();
          // Add greeting if no messages
          if (messages.length === 0) {
            addMessage('assistant', greeting);
          }
        } else {
          userNameInput?.focus();
        }
      }
    }
  });

  // Start call button
  if (startCallBtn) {
    startCallBtn.addEventListener('click', () => {
      startCall();
    });
  }

  // Call control buttons
  if (callMuteBtn) {
    callMuteBtn.addEventListener('click', () => {
      toggleMute();
    });
  }

  if (callChatBtn) {
    callChatBtn.addEventListener('click', () => {
      toggleCallChat();
    });
  }

  if (callEndBtn) {
    callEndBtn.addEventListener('click', () => {
      endCall();
    });
  }

  // Call chat input
  if (callInput) {
    callInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCallMessage();
      }
    });
  }

  if (callSendBtn) {
    callSendBtn.addEventListener('click', sendCallMessage);
  }

  // Input handling
  input.addEventListener('input', () => {
    updateInteractionLocks();
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
    if (!hasUserInfo()) {
      userForm?.classList.add('open');
      widgetInputArea?.classList.add('hideWidgetInputArea');
      userNameInput?.focus();
      return;
    }

    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = '';
    sendBtn.disabled = true;
    isLoading = true;

    addMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });
    showTyping();

    try {
      const userInfo = getUserInfo();
      const response = await fetch(`${apiBaseUrl}/api/avatar/public/${workerId}/chat`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            user_name: getOrCreateUserName(),
            message: text,
            // conversationHistory: conversationHistory.slice(-10),
            name: userInfo?.name,
            email: userInfo?.email,
            phone: userInfo?.phone || "",
          }),
      });

      const data = await response.json();
      hideTyping();

      if (data?.data?.reply) {
        const assistantMessage = data.data.reply;
        // addMessage('assistant', assistantMessage);
        handleAssistantMessage('assistant', assistantMessage);
        conversationHistory.push({ role: 'assistant', content: assistantMessage });
      } else {
        const agentError =
          data?.errors?.agent?.[0] ||
          data?.errors?.[0] ||
          data?.message ||
          data?.error ||
          '';

        const errorMsg = typeof agentError === 'string' ? agentError : '';
        const finalErrorMsg = errorMsg || 'Sorry, I encountered an error. Please try again.';

        // Avoid message spam on fast retries/re-renders.
        const now = Date.now();
        if (finalErrorMsg !== lastChatErrorMessage || now - lastChatErrorAt > 1500) {
          lastChatErrorMessage = finalErrorMsg;
          lastChatErrorAt = now;
          addMessage('assistant', finalErrorMsg);
        }
      }
    } catch (error) {
      hideTyping();
      addMessage('assistant', 'Sorry, I couldn\'t connect. Please try again later.');
      console.error('Qiko Widget Error:', error);
    }

    isLoading = false;
    updateInteractionLocks();
  }

  // Call functions
  async function startCall() {
    try {
      if (!hasUserInfo()) {
        isOpen = true;
        button.classList.add('open');
        chat.classList.add('open');
        callUI.classList.remove('open');
        userForm?.classList.add('open');
        widgetInputArea?.classList.add('hideWidgetInputArea');
        userNameInput?.focus();
        return;
      }

      // Stop any previous call
      if (vapiInstance) {
        try { await vapiInstance.stop(); } catch (_) {}
        vapiInstance = null;
      }

      // We only switch to call UI once voice config is ready (avoids flicker on 403).
      isInCall = false;
      isOpen = true;
      button.classList.add('open');

      // Update status to connecting
      callStatus.textContent = '● Connecting...';

      // Reset any previous embedded call
      if (callIframe) {
        callIframe.style.display = 'none';
        callIframe.src = 'about:blank';
      }

      // Get user info
      const userInfo = getUserInfo();

      // Step 1: Get call config from backend
      const configResponse = await fetch(`${apiBaseUrl}/api/avatar/voice/${workerId}/web-call-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!configResponse.ok) {
        const errText = await configResponse.text().catch(() => '');
        let apiMessage = errText || 'Unknown error';
        try {
          const parsed = JSON.parse(errText);
          apiMessage = parsed?.error || parsed?.message || apiMessage;
        } catch (_) {}

        // Smooth + non-spam: show only once for same error burst.
        const now = Date.now();
        if (apiMessage !== lastChatErrorMessage || now - lastChatErrorAt > 1500) {
          lastChatErrorMessage = apiMessage;
          lastChatErrorAt = now;
          addMessage('assistant', apiMessage);
        }

        // Return to main chat UI.
        isInCall = false;
        isOpen = true;
        chat.classList.add('open');
        callUI.classList.remove('open');
        button.classList.add('open');

        if (callIframe) {
          callIframe.style.display = 'none';
          callIframe.src = 'about:blank';
        }

        return;
      }

      const callConfig = await configResponse.json();
      console.log('Call config response:', callConfig);

      // Extract assistantId and vapiPublicKey from config
      let assistantId = callConfig.data?.voice?.assistantId || callConfig.voice?.assistantId;
      if (!assistantId) {
        throw new Error('Voice config missing assistantId');
      }
      
      let vapiPublicKey = callConfig.data?.voice?.vapiPublicKey || callConfig.voice?.vapiPublicKey;
      if (!vapiPublicKey) {
        throw new Error('Voice config missing Vapi public key');
      }

      // Now that voice is ready, open call UI.
      isInCall = true;
      chat.classList.remove('open');
      callUI.classList.add('open');
      button.classList.add('open');

      // Backend may return encrypted credentials; decrypt them if we were given a key.
      // if (laravelDecryptKey) {
      //   try {
      //     assistantId = await decryptLaravel(assistantId, laravelDecryptKey);
      //   } catch (e) {
      //     console.warn('Failed to decrypt assistantId; using raw value', e);
      //   }
      //   try {
      //     vapiPublicKey = await decryptLaravel(vapiPublicKey, laravelDecryptKey);
      //   } catch (e) {
      //     console.warn('Failed to decrypt vapiPublicKey; using raw value', e);
      //   }
      // }

      // Step 2: Start call with Vapi web SDK (same flow as WorkerCallView.tsx)
      const Vapi = await getVapiClass();
      vapiInstance = new Vapi(vapiPublicKey);

      vapiInstance.on('call-start', () => {
        callStatus.textContent = '● In Call';
      });

      vapiInstance.on('call-end', () => {
        callStatus.textContent = '● Ended';
        isInCall = false;
        vapiInstance = null;
        callUI.classList.remove('open');
        chat.classList.add('open');
        button.classList.remove('open');
        isOpen = true;
      });

      vapiInstance.on('error', (err) => {
        console.error('Vapi error:', err);
        callStatus.textContent = '● Error connecting';
        const msg = extractVapiErrorMessage(err);

        // Show only in main chat (avoid duplicate "call" + "chat" errors).
        const now = Date.now();
        if (msg !== lastChatErrorMessage || now - lastChatErrorAt > 1500) {
          lastChatErrorMessage = msg;
          lastChatErrorAt = now;
          addMessage('assistant', msg);
        }

        isInCall = false;
        chat.classList.add('open');
        callUI.classList.remove('open');
        button.classList.add('open');
      });

      // Display assistant transcript into call chat panel.
      const assistantShownSet = new Set();
      vapiInstance.on('message', (message) => {
        try {
          if (
            message?.type === 'transcript' &&
            message?.role === 'assistant' &&
            message?.transcriptType === 'final'
          ) {
            const transcript = (message?.transcript || '').trim();
            if (!transcript) return;
            const key = `t:${transcript}`;
            if (assistantShownSet.has(key)) return;
            assistantShownSet.add(key);
            addCallMessage('assistant', transcript);
            return;
          }

          if (message?.type === 'conversation-update' && Array.isArray(message?.conversation)) {
            const conv = message.conversation;
            const last = conv[conv.length - 1];
            if (last?.role === 'assistant' && typeof last?.content === 'string') {
              const content = last.content.trim();
              if (!content) return;
              const key = `c:${content}`;
              if (assistantShownSet.has(key)) return;
              assistantShownSet.add(key);
              addCallMessage('assistant', content);
            }
          }
        } catch (e) {
          console.warn('Failed to render Vapi call message:', e);
        }
      });

      const callerName = userInfo?.name || "";
      const callerEmail = userInfo?.email || "";
      // Pass dynamic values to the assistant for this specific call.
      // Keep `assistantId` exactly as returned from backend config.
      const assistantOverrides = {
        variableValues: {
          caller_name: callerName,
          caller_email: callerEmail,
        },
        metadata: {
          caller_name: callerName,
          caller_email: callerEmail,
        },
      };

      const call = await vapiInstance.start(assistantId, assistantOverrides);
      if (call?.id) window.currentVapiCallId = call.id;

      addCallMessage('assistant', 'Voice call started! You can now talk to the AI assistant.');

    } catch (error) {
      console.error('Error starting call:', error);
      callStatus.textContent = '● Failed to connect';
      const msg = extractVapiErrorMessage(error);

      const now = Date.now();
      if (msg !== lastChatErrorMessage || now - lastChatErrorAt > 1500) {
        lastChatErrorMessage = msg;
        lastChatErrorAt = now;
        addMessage('assistant', msg);
      }
      
      if (callIframe) {
        callIframe.style.display = 'none';
        callIframe.src = 'about:blank';
      }

      if (vapiInstance) {
        try { await vapiInstance.stop(); } catch (_) {}
        vapiInstance = null;
      }

      // Reset call state on error
      isInCall = false;
      isOpen = true;
      chat.classList.add('open');
      callUI.classList.remove('open');
      button.classList.add('open');
    }
  }

  function hasUserInfo() {
    const info = getUserInfo();
    return !!(info && info.name && info.email);
  }

  function getUserInfo() {
    try {
      const raw = sessionStorage.getItem(userInfoStorageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Backend expects `user_name` to be a stable UUID for this browser session.
  function getOrCreateUserName() {
    try {
      const existing = sessionStorage.getItem(userNameStorageKey);
      if (existing) return existing;
      const next = (crypto && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(userNameStorageKey, next);
      return next;
    } catch {
      // Very defensive fallback (shouldn't happen in modern browsers).
      return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

  function renderUserFormFromStorage() {
    const info = getUserInfo();
    if (!info) return;
    if (userNameInput) userNameInput.value = info.name || '';
    if (userEmailInput) userEmailInput.value = info.email || '';
    if (userPhoneInput) userPhoneInput.value = info.phone || '';
  }

  function updateInteractionLocks() {
    const ok = hasUserInfo();
    const formOpen = isOpen && !ok;
    if (userForm) userForm.classList.toggle('open', formOpen);
    if (widgetInputArea) widgetInputArea.classList.toggle('hideWidgetInputArea', formOpen);
    if (input) input.disabled = !ok;
    if (sendBtn) sendBtn.disabled = !ok || !input.value.trim() || isLoading;
  }

  function clearStoredUserInfoOnReload() {
    try {
      const navEntry = performance.getEntriesByType?.('navigation')?.[0];
      const isReload = navEntry ? navEntry.type === 'reload' : (performance.navigation && performance.navigation.type === 1);
      if (isReload) sessionStorage.removeItem(userInfoStorageKey);
    } catch {
      // ignore
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (vapiInstance && typeof vapiInstance.setMuted === 'function') {
      vapiInstance.setMuted(isMuted);
    }
    callMuteBtn.classList.toggle('muted', isMuted);

    // Update icon
    if (isMuted) {
      callMuteBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
    } else {
      callMuteBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    }
  }

  function toggleCallChat() {
    callChatPanel.classList.toggle('open');
    if (callChatPanel.classList.contains('open')) {
      callInput.focus();
    }
  }

  async function endCall() {
    try {
      // Stop embedded call
      if (callIframe) {
        callIframe.style.display = 'none';
        callIframe.src = 'about:blank';
      }

      // Stop Vapi SDK call
      if (vapiInstance) {
        try {
          await vapiInstance.stop();
        } catch (_) {}
        vapiInstance = null;
      }

      // End VAPI call if we have a call ID
      if (window.currentVapiCallId) {
        try {
          // Get call config again to get API key
          const configResponse = await fetch(`${apiBaseUrl}/api/avatar/voice/${workerId}/web-call-config`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (configResponse.ok) {
            const callConfig = await configResponse.json();
            
            // End the VAPI call
            await fetch(`https://api.vapi.ai/call/${window.currentVapiCallId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${callConfig.data?.vapiApiKey || ''}`,
              },
            });
          }
        } catch (error) {
          console.error('Error ending VAPI call:', error);
        }
        
        // Clear the stored call ID
        window.currentVapiCallId = null;
      }

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
      }

      // Reset UI
      isInCall = false;
      isMuted = false;
      isOpen = true;

      callUI.classList.remove('open');
      chat.classList.add('open');
      button.classList.remove('open');

      // Reset buttons
      callMuteBtn.classList.remove('muted');
      callChatPanel.classList.remove('open');

      // Reset icons
      callMuteBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>';

      // Clear call messages
      callMessagesEl.innerHTML = '';
      callStatus.textContent = '● Connecting...';

      // Add message to main chat
      addMessage('assistant', 'Call ended. How else can I help you?');
      
    } catch (error) {
      console.error('Error ending call:', error);
      
      // Still reset UI even if ending call fails
      isInCall = false;
      isMuted = false;
      isOpen = true;

      callUI.classList.remove('open');
      chat.classList.add('open');
      button.classList.remove('open');

      callMuteBtn.classList.remove('muted');
      callChatPanel.classList.remove('open');
      callMessagesEl.innerHTML = '';
      callStatus.textContent = '● Connecting...';
      
      addMessage('assistant', 'Call ended. How else can I help you?');
    }
  }

  function addCallMessage(role, content) {
    callMessages.push({ role, content });
    const msgEl = document.createElement('div');
    msgEl.className = `qiko-call-message ${role}`;
    msgEl.textContent = content;
    callMessagesEl.appendChild(msgEl);
    callMessagesEl.scrollTop = callMessagesEl.scrollHeight;
  }

  function sendCallMessage() {
    const text = callInput.value.trim();
    if (!text) return;

    callInput.value = '';
    addCallMessage('user', text);

    // Forward message to Vapi so assistant can respond.
    if (vapiInstance && typeof vapiInstance.send === 'function') {
      try {
        vapiInstance.send({
          type: 'add-message',
          message: {
            role: 'user',
            content: text,
          },
        });
      } catch (e) {
        console.warn('Failed to send call message to Vapi:', e);
        const now = Date.now();
        const msg = 'Voice chat message failed';
        if (msg !== lastChatErrorMessage || now - lastChatErrorAt > 1500) {
          lastChatErrorMessage = msg;
          lastChatErrorAt = now;
          addMessage('assistant', msg);
        }
      }
    }
  }
})();
