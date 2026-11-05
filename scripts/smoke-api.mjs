// Санҷиши тези API: бо ҳар нақши демо ҳамаи роҳҳои GET-ро мепурсад.
// Хатои сервер (5xx) — хато; 403 — нақш дастрасӣ надорад (дуруст).
// Иҷро: API-ро сар кунед (npm run dev), баъд:  node scripts/smoke-api.mjs [http://localhost:4100/api]
const BASE = process.argv[2] ?? 'http://localhost:4100/api';
const PASSWORD = 'demo1234'; // пароли демо (prisma/seed.ts, дар саҳифаи воридшавӣ ҳам навишта шудааст)
const ROLES = ['chef@filialhub.tj', 'manager1@filialhub.tj', 'cashier@filialhub.tj', 'waiter@filialhub.tj'];

const GETS = `alerts audit search?q=a push/key auth/businesses auth/organization auth/me integrations/status integrations/logs
auth/channels auth/organization/whatsapp stats/overview stats/timeseries stats/branches stats/products branches branches/names branches/:branch
users users/:user products products/insights products/reorder products/suppliers products/moves products/:product/moves suppliers suppliers/:supplier
orders orders/export orders/:order debts/summary debts debts/:customer promos customers customers/stats customers/lookup?phone=900
customers/:customer tasks shifts shifts/today shifts/mine expenses expenses/export expenses/pnl messages/contacts messages/contacts/:user
messages/unread messages/thread/:user calls/incoming shop/stores shop/stores/:store shop/stores/:store/stock
online-orders/visits online-orders debt-requests payroll payroll/export payroll/me cash/z ai/status billing admin/overview admin/businesses
admin/billing/payments admin/billing/card`.split(/\s+/);

const get = async (path, token) => {
  const t = Date.now();
  const res = await fetch(`${BASE}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
  return { status: res.status, body, ms: Date.now() - t };
};
const firstId = (b) => (Array.isArray(b) ? b : (b?.items ?? []))[0]?.id;

let errors = 0;
let total = 0;
const slow = [];
for (const email of ROLES) {
  const login = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const { token } = await login.json();
  if (!token) { console.log(`❌ воридшавӣ: ${email} → ${login.status}`); errors++; continue; }
  const ids = {
    branch: firstId((await get('branches', token)).body), user: firstId((await get('users', token)).body),
    product: firstId((await get('products', token)).body), supplier: firstId((await get('suppliers', token)).body),
    order: firstId((await get('orders', token)).body), customer: firstId((await get('customers', token)).body),
    store: firstId((await get('shop/stores', token)).body),
  };
  let ok = 0;
  let forbidden = 0;
  for (const g of GETS) {
    const path = g.replace(/:(\w+)/g, (_, k) => ids[k] ?? 0);
    const r = await get(path, token);
    total++;
    if (r.ms > 800) slow.push(`${r.ms}ms ${email.split('@')[0]} ${path}`);
    if (r.status >= 500) { errors++; console.log(`❌ ${r.status} ${email} GET ${path} ${JSON.stringify(r.body).slice(0, 200)}`); }
    else if (r.status === 401 || r.status === 403) forbidden++;
    else if (r.status >= 400 && !(r.status === 404 && /:/.test(g))) console.log(`⚠️  ${r.status} ${email} GET ${path} ${JSON.stringify(r.body).slice(0, 160)}`);
    else ok++;
  }
  console.log(`${email}: ok=${ok}, барои нақш баста=${forbidden}`);
}
console.log(`\nҲамагӣ ${total} дархост, хатои сервер: ${errors}`);
if (slow.length) console.log('Суст (> 0,8 с):\n' + slow.join('\n'));
process.exit(errors ? 1 : 0);
