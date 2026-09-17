import { t, STRINGS } from './i18n.js';

const CART_KEY = 'gajanand.cart.v2';
const LANG_KEY = 'gajanand.lang';
const IST = 'Asia/Kolkata';
const MAX_PER_ITEM = 20;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const state = {
  lang: 'en',
  business: null,
  categories: [],
  items: new Map(),
  cart: loadCart(),
  category: null,
  search: '',
  orderType: 'delivery',
  payment: 'upi',
  lastOrder: null
};

const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(Number(value) || 0);

const say = (key, vars) => t(state.lang, key, vars);

/* ---------- storage ---------- */

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch { /* private mode */ }
}

/* ---------- opening hours, in India time regardless of the visitor's clock ---------- */

function istNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date()).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return {
    date: `${parts.year}${parts.month}${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

const toMinutes = value => {
  const [h, m] = String(value || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const pretty12h = value => {
  const total = toMinutes(value);
  if (total === null) return value;
  const hour = Math.floor(total / 60), minute = total % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${minute ? ':' + String(minute).padStart(2, '0') : ''} ${suffix}`;
};

function isOpen() {
  const b = state.business;
  if (!b || b.closedToday === true) return false;
  const open = toMinutes(b.openTime), close = toMinutes(b.closeTime);
  if (open === null || close === null) return true;
  const { minutes } = istNow();
  // handles a close time past midnight, e.g. 11:00 to 01:00
  return close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;
}

/* ---------- boot ---------- */

async function init() {
  state.lang = (() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && STRINGS[saved]) return saved;
    } catch { /* private mode */ }
    return (navigator.language || '').toLowerCase().startsWith('gu') ? 'gu' : 'en';
  })();
  state.category = say('allCategories');

  try {
    const [business, menu] = await Promise.all([
      fetch('business.json', { cache: 'no-cache' }).then(r => r.json()),
      fetch('menu.json', { cache: 'no-cache' }).then(r => r.json())
    ]);
    state.business = business;
    state.categories = menu;
    for (const group of menu) {
      for (const item of group.items) {
        state.items.set(item.id, { ...item, category: group.category, categoryGu: group.categoryGu });
      }
    }
    // drop anything that left the menu or sold out since the cart was saved
    for (const id of Object.keys(state.cart)) {
      const item = state.items.get(id);
      if (!item || item.soldOut) delete state.cart[id];
    }
    saveCart();
  } catch {
    $('#menuGrid').innerHTML = `<div class="empty-results">${esc(say('menuFailed'))}</div>`;
    return;
  }

  applyLanguage();
  bindEvents();
  setInterval(renderStatus, 60_000);
}

/* ---------- language ---------- */

const itemName = item => (state.lang === 'gu' && item.nameGu) || item.name;
const itemDesc = item => (state.lang === 'gu' && item.descriptionGu) || item.description;
const catName = group => (state.lang === 'gu' && group.categoryGu) || group.category;
const bizText = (key, keyGu) => (state.lang === 'gu' && state.business[keyGu]) || state.business[key];

function toggleLanguage() {
  state.lang = state.lang === 'en' ? 'gu' : 'en';
  try { localStorage.setItem(LANG_KEY, state.lang); } catch { /* ignore */ }
  state.category = say('allCategories');
  applyLanguage();
}

function applyLanguage() {
  const b = state.business;
  document.documentElement.lang = state.lang;

  $$('[data-i18n]').forEach(node => { node.textContent = say(node.dataset.i18n); });
  $$('[data-i18n-attr]').forEach(node => {
    const [attr, key] = node.dataset.i18nAttr.split(':');
    node.setAttribute(attr, say(key));
  });

  $('#langToggle').textContent = say('langName');
  $('#brandName').textContent = state.lang === 'gu' ? (b.nameGu || b.name) : b.name;
  $('#heroLine1').textContent = say('heroLine1');
  $('#heroLine2').textContent = say('heroLine2');
  $('#addressText').textContent = bizText('address', 'addressGu');
  $('#areaNote').textContent = bizText('deliveryAreaNote', 'deliveryAreaNoteGu');
  $('#prepNote').textContent = bizText('prepTimeNote', 'prepTimeNoteGu');
  $('#phoneLink').textContent = b.phoneDisplay;
  $('#phoneLink').href = `tel:+${b.phoneWhatsApp}`;
  $('#callLink').href = `tel:+${b.phoneWhatsApp}`;
  $('#whatsappLink').href = `https://wa.me/${b.phoneWhatsApp}`;
  $('#directionsLink').href = b.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(b.address)}`;
  $('#hoursText').textContent = `${pretty12h(b.openTime)} – ${pretty12h(b.closeTime)}`;

  $('#fssaiLine').hidden = !b.fssai;
  if (b.fssai) $('#fssaiLine').textContent = `${say('fssaiLabel')}: ${b.fssai}`;

  $('#typeDelivery').textContent = `${say('delivery_')} · +${money(b.deliveryFee)}`;
  $('#typeTakeaway').textContent = say('takeaway');
  $('#payUpi').textContent = say('payUpi');
  renderPaymentChoices();

  renderStatus();
  renderPills();
  renderMenu();
  renderCart();
}

/* ---------- rendering ---------- */

function renderStatus() {
  if (!state.business) return;
  const open = isOpen();
  const bar = $('#statusBar');
  bar.classList.toggle('shut', !open);
  $('#statusLabel').textContent = open ? say('openNow') : say('closedNow');
  $('#statusDetail').textContent = open
    ? `${pretty12h(state.business.openTime)} – ${pretty12h(state.business.closeTime)}`
    : (bizText('closedMessage', 'closedMessageGu') || say('opensAt', { time: pretty12h(state.business.openTime) }));
  $('#closedNotice').hidden = open;
  $('#closedNotice').textContent = open ? '' : say('closedNote');
}

function renderPills() {
  const all = say('allCategories');
  const names = [all, ...state.categories.map(catName)];
  $('#categoryPills').innerHTML = names.map(name =>
    `<button class="pill" type="button" role="button" aria-pressed="${state.category === name}" data-category="${esc(name)}">${esc(name)}</button>`
  ).join('');
}

function visibleItems() {
  const term = state.search.trim().toLowerCase();
  const all = say('allCategories');
  return state.categories.flatMap(group =>
    group.items.map(item => ({ ...item, category: group.category, categoryGu: group.categoryGu, groupLabel: catName(group) }))
  ).filter(item => {
    if (state.category !== all && item.groupLabel !== state.category) return false;
    if (!term) return true;
    return `${item.name} ${item.nameGu || ''} ${item.description} ${item.descriptionGu || ''} ${item.groupLabel}`
      .toLowerCase().includes(term);
  });
}

function renderMenu() {
  const items = visibleItems();
  if (!items.length) {
    $('#menuGrid').innerHTML = `<div class="empty-results">${esc(say('noResults'))}</div>`;
    return;
  }
  $('#menuGrid').innerHTML = items.map(item => {
    const qty = state.cart[item.id] || 0;
    const action = item.soldOut
      ? `<span class="sold-out-tag">${esc(say('soldOut'))}</span>`
      : qtyControl(item.id, qty);
    return `<article class="dish-card${item.soldOut ? ' out' : ''}">
      <div>
        <span class="dish-category">${esc(item.groupLabel)}</span>
        <h3>${esc(itemName(item))}</h3>
        <p>${esc(itemDesc(item))}</p>
        <div class="dish-price">${money(item.price)}</div>
      </div>
      <div class="dish-side">
        <span class="veg-mark" role="img" aria-label="${esc(say('vegetarian'))}"></span>
        <div class="dish-actions">${action}</div>
      </div>
    </article>`;
  }).join('');
}

function qtyControl(id, qty) {
  if (!qty) return `<button class="add-button" type="button" data-add="${esc(id)}">${esc(say('add'))}</button>`;
  return `<div class="qty-control">
    <button type="button" data-change="${esc(id)}" data-delta="-1" aria-label="${esc(say('removeOne'))}">&minus;</button>
    <span aria-live="polite">${qty}</span>
    <button type="button" data-change="${esc(id)}" data-delta="1" aria-label="${esc(say('addOne'))}">+</button>
  </div>`;
}

function totals() {
  let count = 0, subtotal = 0;
  for (const [id, qty] of Object.entries(state.cart)) {
    const item = state.items.get(id);
    if (!item) continue;
    count += qty;
    subtotal += item.price * qty;
  }
  const b = state.business;
  const above = Number(b.freeDeliveryAbove) || 0;
  const waived = above > 0 && subtotal >= above;
  const deliveryFee = count && state.orderType === 'delivery' && !waived ? Number(b.deliveryFee) || 0 : 0;
  return { count, subtotal, deliveryFee, waived, total: subtotal + deliveryFee };
}

function renderCart() {
  if (!state.business) return;
  const sums = totals();
  const minimum = Number(state.business.minimumOrder) || 0;

  $('#cartTop').textContent = `${say('cart')} · ${sums.count}`;
  $('#barTotal').textContent = money(sums.total);
  $('#barCount').textContent = `${sums.count} ${sums.count === 1 ? say('item') : say('items')}`;
  $('#cartBar').classList.toggle('visible', sums.count > 0);

  const lines = Object.entries(state.cart).filter(([id]) => state.items.has(id));
  $('#cartLines').innerHTML = lines.length ? lines.map(([id, qty]) => {
    const item = state.items.get(id);
    return `<div class="cart-line">
      <div><strong>${esc(itemName(item))}</strong><small>${money(item.price)} ${esc(say('each'))}</small></div>
      ${qtyControl(id, qty)}
      <div class="line-total">${money(item.price * qty)}</div>
    </div>`;
  }).join('') : `<p class="empty-results">${esc(say('emptyCart'))}</p>`;

  const deliveryValue = sums.waived ? say('free') : money(sums.deliveryFee);
  $('#totals').innerHTML = `
    <div class="total-row"><span>${esc(say('subtotal'))}</span><span>${money(sums.subtotal)}</span></div>
    ${state.orderType === 'delivery' ? `<div class="total-row"><span>${esc(say('delivery'))}</span><span>${esc(deliveryValue)}</span></div>` : ''}
    <div class="total-row grand"><span>${esc(say('total'))}</span><span>${money(sums.total)}</span></div>`;

  const belowMinimum = minimum > 0 && sums.subtotal < minimum;
  const submit = $('#submitOrder');
  submit.disabled = !sums.count || belowMinimum;
  submit.textContent = belowMinimum
    ? say('minimumOrder', { amount: money(minimum) })
    : `${say('sendOrder')} · ${money(sums.total)}`;
}

function renderPaymentChoices() {
  $('#payCash').textContent = state.orderType === 'takeaway' ? say('payCashTakeaway') : say('payCash');
  $('#paymentNote').textContent = state.payment === 'upi' ? say('upiNote') : say('cashNote');
  $('#addressField').hidden = state.orderType === 'takeaway';
  $('#typeDelivery').setAttribute('aria-pressed', String(state.orderType === 'delivery'));
  $('#typeTakeaway').setAttribute('aria-pressed', String(state.orderType === 'takeaway'));
  $('#payUpi').setAttribute('aria-pressed', String(state.payment === 'upi'));
  $('#payCash').setAttribute('aria-pressed', String(state.payment === 'cash'));
}

/* ---------- cart actions ---------- */

function changeQty(id, delta) {
  const item = state.items.get(id);
  if (!item || item.soldOut) return;
  const next = Math.max(0, Math.min(MAX_PER_ITEM, (state.cart[id] || 0) + delta));
  if (next) state.cart[id] = next; else delete state.cart[id];
  saveCart();
  renderMenu();
  renderCart();
}

/* ---------- checkout ---------- */

function openCheckout() {
  if (!totals().count) {
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  $('#checkoutStep').hidden = false;
  $('#sentStep').hidden = true;
  $('#drawerTitle').textContent = say('yourOrder');
  renderCart();
  $('#checkoutDialog').showModal();
  document.body.classList.add('locked');
}

function closeCheckout() {
  $('#checkoutDialog').close();
}

function clearErrors() {
  $$('.field-error').forEach(node => { node.textContent = ''; });
  $$('#orderForm [aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
  $('#formAlert').classList.remove('visible');
}

const normalisePhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

function validate() {
  const errors = {};
  const name = $('#customerName').value.trim().replace(/\s+/g, ' ');
  const phone = normalisePhone($('#phone').value);
  const address = $('#address').value.trim().replace(/\s+/g, ' ');

  if (name.length < 2) errors.customerName = say('errName');
  if (!/^[6-9][0-9]{9}$/.test(phone)) errors.phone = say('errPhone');
  if (state.orderType === 'delivery' && address.length < 8) errors.address = say('errAddress');

  for (const [field, message] of Object.entries(errors)) {
    const box = $(`[data-error="${field}"]`);
    if (box) box.textContent = message;
    const input = $(`#${field === 'customerName' ? 'customerName' : field}`);
    if (input) input.setAttribute('aria-invalid', 'true');
  }
  if (Object.keys(errors).length) {
    $(`#${Object.keys(errors)[0]}`)?.focus();
    return null;
  }
  return { name, phone, address, note: $('#note').value.trim().replace(/\s+/g, ' ') };
}

function makeReference() {
  const { date } = istNow();
  const random = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `GCK-${date.slice(2)}-${random}`;
}

function buildOrderText(order) {
  const lines = order.lines
    .map((line, i) => `${i + 1}. ${line.name} x${line.qty} = ${money(line.total)}`)
    .join('\n');

  const rows = [
    say('waGreeting'),
    '',
    `${say('waRef')}: ${order.reference}`,
    '',
    `${say('waItems')}:`,
    lines,
    '',
    `${say('waSubtotal')}: ${money(order.subtotal)}`
  ];
  if (order.orderType === 'delivery') rows.push(`${say('waDelivery')}: ${order.deliveryFee ? money(order.deliveryFee) : say('free')}`);
  rows.push(
    `${say('waTotal')}: ${money(order.total)}`,
    '',
    `${say('waName')}: ${order.name}`,
    `${say('waPhone')}: ${order.phone}`,
    `${say('waType')}: ${order.orderType === 'delivery' ? say('delivery_') : say('takeaway')}`
  );
  if (order.orderType === 'delivery') rows.push(`${say('waAddress')}: ${order.address}`);
  if (order.note) rows.push(`${say('waNote')}: ${order.note}`);
  rows.push(
    `${say('waPayment')}: ${order.payment === 'upi' ? say('waPayUpi') : say('waPayCash')}`,
    '',
    say('waClosing')
  );
  return rows.join('\n');
}

const whatsappUrl = order =>
  `https://wa.me/${state.business.phoneWhatsApp}?text=${encodeURIComponent(buildOrderText(order))}`;

function upiUrl(order) {
  const params = new URLSearchParams({
    pa: state.business.upiId,
    pn: state.business.upiName || state.business.name,
    am: String(order.total),
    cu: 'INR',
    tn: order.reference
  });
  return `upi://pay?${params.toString()}`;
}

function submitOrder(event) {
  event.preventDefault();
  clearErrors();
  const details = validate();
  if (!details) return;

  const sums = totals();
  if (!sums.count) return;

  const order = {
    reference: makeReference(),
    ...details,
    orderType: state.orderType,
    payment: state.payment,
    subtotal: sums.subtotal,
    deliveryFee: sums.deliveryFee,
    total: sums.total,
    lines: Object.entries(state.cart)
      .filter(([id]) => state.items.has(id))
      .map(([id, qty]) => {
        const item = state.items.get(id);
        return { name: itemName(item), qty, total: item.price * qty };
      })
  };

  state.lastOrder = order;
  window.open(whatsappUrl(order), '_blank', 'noopener');
  showSent(order);

  state.cart = {};
  saveCart();
  renderMenu();
  renderCart();
}

function showSent(order) {
  const upi = order.payment === 'upi';
  $('#drawerTitle').textContent = say('sentHeading');
  $('#checkoutStep').hidden = true;
  $('#sentStep').hidden = false;
  $('#sentStep').innerHTML = `
    <div class="sent-mark" aria-hidden="true">✓</div>
    <h3>${esc(say('sentHeading'))}</h3>
    <p>${esc(say('sentBody'))}</p>
    <p><span class="fine-print">${esc(say('sentRef'))}</span><br><span class="order-ref">${esc(order.reference)}</span></p>
    <div class="sent-actions">
      <a class="button whatsapp full" id="reopenWhatsapp" href="${esc(whatsappUrl(order))}" target="_blank" rel="noopener">${esc(say('openWhatsapp'))}</a>
      ${upi ? `<a class="button primary full" href="${esc(upiUrl(order))}">${esc(say('payNow', { amount: money(order.total) }))}</a>` : ''}
      <button class="button ghost full" type="button" id="copyOrder">${esc(say('copyOrder'))}</button>
    </div>
    ${upi ? `<div class="upi-box">
      <strong>${esc(say('upiIdLabel'))}</strong>
      <div class="upi-id"><span>${esc(state.business.upiId)}</span><button type="button" id="copyUpi">${esc(say('copyUpi'))}</button></div>
      <p class="fine-print" style="margin-bottom:0">${esc(say('upiWarning'))}</p>
    </div>` : ''}
    <p><button class="link-button" type="button" id="startNew">${esc(say('startNew'))}</button></p>`;

  $('#copyOrder').addEventListener('click', () => copy(buildOrderText(order), say('copied')));
  $('#copyUpi')?.addEventListener('click', () => copy(state.business.upiId, say('copiedUpi')));
  $('#startNew').addEventListener('click', closeCheckout);
}

async function copy(text, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.cssText = 'position:absolute;left:-9999px';
    document.body.appendChild(helper);
    helper.select();
    try { document.execCommand('copy'); } catch { /* nothing else to try */ }
    helper.remove();
  }
  toast(message);
}

let toastTimer;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 2500);
}

/* ---------- events ---------- */

function bindEvents() {
  $('#langToggle').addEventListener('click', toggleLanguage);

  $('#menuSearch').addEventListener('input', event => {
    state.search = event.target.value;
    renderMenu();
  });

  $('#categoryPills').addEventListener('click', event => {
    const pill = event.target.closest('[data-category]');
    if (!pill) return;
    state.category = pill.dataset.category;
    renderPills();
    renderMenu();
  });

  document.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    if (add) changeQty(add.dataset.add, 1);
    const change = event.target.closest('[data-change]');
    if (change) changeQty(change.dataset.change, Number(change.dataset.delta));
  });

  $('#cartTop').addEventListener('click', openCheckout);
  $('#reviewOrder').addEventListener('click', openCheckout);
  $('#closeDrawer').addEventListener('click', closeCheckout);
  $('#checkoutDialog').addEventListener('click', event => {
    if (event.target === $('#checkoutDialog')) closeCheckout();
  });
  $('#checkoutDialog').addEventListener('close', () => document.body.classList.remove('locked'));

  $('#orderTypeChoices').addEventListener('click', event => {
    const button = event.target.closest('[data-value]');
    if (!button) return;
    state.orderType = button.dataset.value;
    renderPaymentChoices();
    renderCart();
  });

  $('#paymentChoices').addEventListener('click', event => {
    const button = event.target.closest('[data-value]');
    if (!button) return;
    state.payment = button.dataset.value;
    renderPaymentChoices();
  });

  $('#orderForm').addEventListener('submit', submitOrder);
}

init();
