import 'dotenv/config';
import { sendDigitalHubWhatsApp } from './src/utils/whatsapp.ts';

try {
  const r = await sendDigitalHubWhatsApp({ to: '96176461380', body: 'test ' + new Date().toISOString() });
  console.log('result:', JSON.stringify(r, null, 2));
} catch (e) {
  console.error('error:', e);
}
