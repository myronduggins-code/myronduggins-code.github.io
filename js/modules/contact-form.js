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

    // check every field and show what's wrong under each one
    let firstBad = null;
    let badCount = 0;
    for (const f of fields) {
      const msg = problemWith(f);
      showFieldError(f, msg);
      if (msg) { badCount += 1; if (!firstBad) firstBad = f; }
    }
    if (firstBad) {
      setStatus(badCount > 1
        ? 'Please fix the highlighted fields to send your message.'
        : 'Please fix the highlighted field to send your message.', 'error');
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
      fields.forEach((f) => showFieldError(f, ''));
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

  // clear a field's error as soon as it's fixed
  form.addEventListener('input', (e) => {
    const f = e.target;
    if (f.getAttribute('aria-invalid') === 'true' && !problemWith(f)) {
      showFieldError(f, '');
      if (!fields.some((x) => x.getAttribute('aria-invalid') === 'true')) setStatus('');
    }
  });
}

function problemWith(field) {
  const value = field.value.trim();
  if (field.name === 'name' && !value) return 'Enter your name.';
  if (field.name === 'email') {
    if (!value) return 'Enter your email address.';
    if (!field.checkValidity()) return 'Enter an email address like name@example.com.';
  }
  if (field.name === 'message' && !value) return 'Write a message before sending.';
  return '';
}

function showFieldError(field, message) {
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  const slot = document.getElementById(`${field.id}-error`);
  if (slot) slot.textContent = message;
}
