document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    console.info('[Send payment] Payload', payload);
    const btn = form.querySelector('.btn--primary');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        alert('Payment submitted (demo)');
      }, 800);
    }
  });
});


