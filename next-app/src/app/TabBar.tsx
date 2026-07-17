import { headers } from 'next/headers';
import TabBarClient from './TabBarClient';

function isCNHost(host: string) {
  return host.includes('horiculture.club') || host.includes('106.12.91.182') || host.startsWith('100.96.54.109') || host.startsWith('localhost') || host.startsWith('127.');
}

export default async function TabBar() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase();
  const isCN = isCNHost(host);
  return <TabBarClient isCN={isCN} />;
}
