(function(global) {
   function getBgColor(type) {
    switch (type) {
      case 'success': return '#28a745';
      case 'error':   return '#dc3545';
      case 'info':    return '#007bff';
      case 'warning': return '#ffc107';
      default:        return '#333';
    }
  }

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
      width: '100%',
      pointerEvents: 'none',
    });

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    Object.assign(alert.style, {
      position: 'relative',
      padding: '5px 30px 5px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'sans-serif',
      color: '#fff',
      backgroundColor: getBgColor(type),
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
      opacity: '1',
      transition: 'opacity 0.3s ease',
      pointerEvents: 'auto',
      maxWidth: '90vw',
      textAlign: 'center',
    });

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    alert.appendChild(messageSpan);

    // Tombol X menggunakan <span>
    const closeSpan = document.createElement('span');
    closeSpan.innerHTML = '&times;';
    Object.assign(closeSpan.style, {
      position: 'absolute',
      top: '0px',
      right: '6px',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#fff',
      cursor: 'pointer',
      lineHeight: '1',
      padding: '6px',
      userSelect: 'none',
    });

    closeSpan.addEventListener('click', () => {
      alert.style.opacity = '0';
      setTimeout(() => wrapper.remove(), 300);
    });

    alert.appendChild(closeSpan);
    wrapper.appendChild(alert);
    document.body.appendChild(wrapper);

    // Auto-close jika durasi > 0
    if (duration > 0) {
      setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => wrapper.remove(), 300);
      }, duration);
    }
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

  const utils = {
    showAlert,
    sleep,
    copyToClipboard,
    formatDate,
    getFormData,
    debounce,
  };

  // Simpan sebagai utils
  global.utils = utils;

  // Ekspor semua fungsi ke global (window)
  Object.entries(utils).forEach(([key, value]) => {
    global[key] = value;
  });

})(window);
