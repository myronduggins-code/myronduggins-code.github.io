import { boot } from '../modules/boot.js';
import { initContactForm } from '../modules/contact-form.js';
import { homePath } from '../paths/home.js';

initContactForm(document.getElementById('form-contact'));

boot(homePath);
