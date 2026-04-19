import 'dotenv/config';
import { sendDigitalHubWhatsApp } from './src/utils/whatsapp.ts';

if (String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production') {
  console.error('wa-test must not run in production.');
  process.exit(1);
}

const to = String(process.env.WA_TEST_TO || '').trim();
const body = String(process.env.WA_TEST_BODY || `test ${new Date().toISOString()}`).trim();

if (!to) {
  console.error('Set WA_TEST_TO in your environment before running wa-test.');
  process.exit(1);
}

try {
  const r = await sendDigitalHubWhatsApp({ to, body });
  console.log('result:', JSON.stringify(r, null, 2));
} catch (e) {
  console.error('error:', e);
}
