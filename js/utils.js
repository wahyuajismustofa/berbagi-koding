// utils.js
(function(global) {
  'use strict';
  
  function showAlert(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.alert-wrapper');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'alert-wrapper';
    Object.assign(wrapper.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '9999',
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
      width: '100%',
    });

    const alert = document.createElement('div');
    const bg = {
      success: '#28a745',
      error: '#dc3545',
      info: '#007bff',
      warning: '#ffc107',
    }[type] || '#333';

    Object.assign(alert.style, {
      backgroundColor: bg,
      color: '#fff',
      padding: '8px 14px',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'sans-serif',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
      pointerEvents: 'auto',
      maxWidth: '90vw',
      position: 'relative',
    });

    alert.textContent = message;
	
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '2px',
      right: '10px',
      cursor: 'pointer',
      fontSize: '18px',
    });
    closeBtn.onclick = () => wrapper.remove();
    alert.appendChild(closeBtn);

    wrapper.appendChild(alert);
    document.body.appendChild(wrapper);

    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => wrapper.remove(), 300);
    }, duration);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function copyToClipboard(text) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
  }
  
  function formatDate(date = new Date()) {
    return [
      String(date.getDate()).padStart(2, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      date.getFullYear()
    ].join('/');
  }

  function getFormData(formElement) {
    const formData = new FormData(formElement);
    return Object.fromEntries(formData.entries());
  }

  function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  
  global.utils = {
    showAlert,
    sleep,
    copyToClipboard,
    formatDate,
    getFormData,
    debounce,
  };
})(window);
