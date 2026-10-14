// Contact form: validates, then sends the message through Web3Forms, which
// emails it to myronduggins@googlemail.com. No page reload; the button shows
// "Sending…" and the status line confirms or explains what went wrong.
//
// The access key is meant to be public: it can only deliver messages to the
// inbox it was created for. Manage it at https://web3forms.com.

const ENDPOINT = 'https://api.web3forms.com/submit';
const ACCESS_KEY = 'f02cdc26-f564-4c73-bcb2-283f69291d21';
const TO = 'myronduggins@googlemail.com';

export function initContactForm(form) {
  if (!form) return;
  const status = form.querySelector('.form__status');
  const button = form.querySelector('button[type="submit"]');
  const buttonLabel = button.textContent;
  // only the visible fields are validated; the spam trap is left out
  const fields = [...form.querySelectorAll('input:not([name="botcheck"]), textarea')];
  let sending = false;

  const setStatus = (text, tone = '') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;

    let firstBad = null;
    for (const f of fields) {
      const bad = !f.checkValidity() || !f.value.trim();
      f.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad && !firstBad) firstBad = f;
    }
    if (firstBad) {
      setStatus(firstBad.type === 'email' && firstBad.value
        ? 'Enter an email address like name@example.com.'
        : `Fill in your ${firstBad.name} to send a message.`, 'error');
      firstBad.focus();
      return;
    }

    const data = new FormData(form);
    // spam trap: people never tick the hidden box, bots usually do
    if (data.get('botcheck')) {
      form.reset();
      setStatus('Thanks, your message has been sent.', 'ok');
      return;
    }

    sending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    setStatus('');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          subject: `Portfolio enquiry from ${data.get('name')}`,
          from_name: 'Myron Duggins portfolio',
          name: data.get('name'),
          email: data.get('email'),
          replyto: data.get('email'),
          message: data.get('message'),
          botcheck: false,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);

      form.reset();
      fields.forEach((f) => f.setAttribute('aria-invalid', 'false'));
      setStatus('Thanks, your message has been sent. I’ll get back to you soon.', 'ok');
    } catch (err) {
      console.warn('[contact] send failed:', err);
      setStatus(`Your message couldn’t be sent just now. Please try again, or email me at ${TO}.`, 'error');
    } finally {
      sending = false;
      button.disabled = false;
      button.textContent = buttonLabel;
    }
  });

  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity() && e.target.value.trim()) {
      e.target.setAttribute('aria-invalid', 'false');
    }
  });
}
