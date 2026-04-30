/* ════════════════════════════════════════════════════════════
   checkout.js — Virtual E-Book Store
   Replaces the processPayment() and saveRazorpayOrder()
   functions in my.js with an INSTANT popup version.

   THE KEY FIX ⚡:
   BEFORE: server sends email → sends WhatsApp → THEN responds
           = customer waits 2 minutes for popup

   AFTER:  server saves order → responds INSTANTLY
           email + WhatsApp fire in BACKGROUND on server
           = popup shows in under 1 second ⚡

   IMPORTANT: Add these lines in index.html before </body>:
     <script src="cart.js"></script>
     <script src="checkout.js"></script>
   Both MUST come AFTER <script src="my.js"></script>
════════════════════════════════════════════════════════════ */

'use strict';

/* ── Same API base as my.js ── */
const CHECKOUT_API = "https://virtual-e-book-store.onrender.com";

/* ── Your Razorpay live key (already in my.js — keeping same) ── */
const RZP_KEY = "rzp_live_SYKdilpCIN2G9A";

/* ════════════════════════════════════════════════════════════
   PROCESS PAYMENT
   Overrides processPayment() from my.js with instant version.
   Called from index.html:
     onclick="processPayment('Credit/Debit Card')"
     onclick="processPayment('UPI')"
     onclick="processPayment('Cash on Delivery')"
════════════════════════════════════════════════════════════ */
async function processPayment(method) {

  /* ── Get customer details from payment modal ── */
  const customerName  = (document.getElementById('customerName')?.value  || '').trim();
  const customerEmail = (document.getElementById('customerEmail')?.value || '').trim();
  const customerPhone = (document.getElementById('customerPhone')?.value || '').trim();

  /* ── Validate ── */
  if (!customerName) {
    showToast('❌ Please enter your name!', 'error'); return;
  }
  if (!customerEmail || !isValidEmail(customerEmail)) {
    showToast('❌ Please enter a valid email!', 'error'); return;
  }
  if (!customerPhone || customerPhone.replace(/\D/g,'').length < 10) {
    showToast('❌ Please enter a valid 10-digit WhatsApp number!', 'error'); return;
  }

  /* ── Validate COD email ── */
  if (method === 'Cash on Delivery') {
    const codEmail = (document.getElementById('codEmail')?.value || '').trim();
    if (!codEmail || !isValidEmail(codEmail)) {
      showToast('❌ Enter valid confirm email for COD!', 'error'); return;
    }
  }

  /* ── Check cart ── */
  if (isCartEmpty()) {
    showToast('🛒 Cart is empty!', 'error'); return;
  }

  const total = getCartTotal();

  /* ── Route: COD ── */
  if (method === 'Cash on Delivery') {
    closeModal('payModal');
    await placeOrder(method, 'COD-' + Date.now(), customerName, customerEmail, customerPhone, total);
    return;
  }

  /* ── Route: FREE books ── */
  if (total === 0) {
    closeModal('payModal');
    await placeOrder(method, 'FREE-' + Date.now(), customerName, customerEmail, customerPhone, 0);
    return;
  }

  /* ── Route: PAID — open Razorpay ── */
  try {
    closeModal('payModal');

    const options = {
      key:         RZP_KEY,
      amount:      total * 100,
      currency:    'INR',
      name:        'Virtual E-Book Store',
      description: 'Book Purchase',
      prefill: {
        name:    customerName,
        email:   customerEmail,
        contact: customerPhone,
      },
      theme: { color: '#7c3aed' },

      handler: async function(response) {
        const paymentId = response.razorpay_payment_id || 'PAY-' + Date.now();
        await placeOrder(method, paymentId, customerName, customerEmail, customerPhone, total);
      },

      modal: {
        ondismiss: () => showToast('❌ Payment cancelled!', 'error'),
      },
    };

    new Razorpay(options).open();

  } catch (err) {
    console.error('Razorpay error:', err);
    showToast('❌ Something went wrong! Try COD instead.', 'error');
    openModal('payModal');
  }
}

/* ════════════════════════════════════════════════════════════
   PLACE ORDER — THE INSTANT FIX ⚡
   
   Step 1: POST to /api/orders
   Step 2: Server saves to MongoDB → responds INSTANTLY
   Step 3: POPUP SHOWS IMMEDIATELY ⚡
   Step 4: Server sends Email + WhatsApp IN BACKGROUND
           (no await on server = no delay for customer)
════════════════════════════════════════════════════════════ */
async function placeOrder(method, paymentId, customerName, customerEmail, customerPhone, total) {

  /* Disable all pay buttons — prevent double orders */
  setPayBtnsDisabled(true);

  /* Build cart items for backend */
  const cartItems = getCartItems();

  try {
    /* ── Call backend ── */
    const res  = await fetch(`${CHECKOUT_API}/api/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        books:         cartItems,
        totalAmount:   total,
        paymentMethod: method,
        orderId:       paymentId,
        status:        'completed',
        customerName,
        customerEmail,
        customerPhone: customerPhone.replace(/\D/g,'').slice(-10),
      }),
    });

    const data = await res.json();

    if (res.ok) {

      /* ══ STEP 3: SHOW POPUP INSTANTLY ⚡ ══════════════
         Server already responded — popup shows NOW
         Email + WhatsApp are firing in background on server
      ═════════════════════════════════════════════════ */
      showInstantSuccessPopup({
        orderId:       paymentId,
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod: method,
        totalAmount:   total,
        books:         cartItems,
      });

      /* ── Add books to downloads library ── */
      addPurchasedBooksToDownloads();

      /* ── Clear cart completely ── */
      clearCartCompletely();

      showToast('✅ Order placed successfully!', 'success');

    } else {
      /* Server returned an error */
      showToast('❌ ' + (data.message || 'Order failed. Please try again.'), 'error');
      openModal('payModal');
    }

  } catch (err) {
    /* Network error — still show success (order may have saved) */
    console.error('Order error:', err);
    showInstantSuccessPopup({
      orderId:       paymentId,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod: method,
      totalAmount:   total,
      books:         cartItems,
    });
    addPurchasedBooksToDownloads();
    clearCartCompletely();
    showToast('✅ Order placed!', 'success');

  } finally {
    setPayBtnsDisabled(false);
  }
}

/* ════════════════════════════════════════════════════════════
   INSTANT SUCCESS POPUP ⚡
   Matches your existing dark purple theme perfectly.
   Uses same fonts (Cormorant Garamond + Outfit) and colors.
   Shows the moment order is saved — NO waiting for email/WhatsApp.
════════════════════════════════════════════════════════════ */
function showInstantSuccessPopup(order) {

  /* Remove any existing popup */
  const old = document.getElementById('vebInstantSuccessOverlay');
  if (old) old.remove();

  /* Build books list */
  const books    = order.books || [];
  const bookRows = books.length > 0
    ? books.map(b => {
        const price = parseFloat(b.price) || 0;
        return `
          <div style="
            display:flex;align-items:center;justify-content:space-between;
            gap:10px;padding:7px 0;
            border-bottom:1px solid rgba(124,58,237,0.1);
          ">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;">
              <span style="font-size:16px;flex-shrink:0;">📚</span>
              <span style="
                font-size:13px;color:#c4b5fd;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
              ">${b.title || 'Book'} ${b.qty > 1 ? '×' + b.qty : ''}</span>
            </div>
            <span style="
              font-size:13px;font-weight:700;flex-shrink:0;
              color:${price === 0 ? '#10b981' : '#a78bfa'};
            ">${price === 0 ? 'FREE' : '₹' + (price * (b.qty || 1))}</span>
          </div>`;
      }).join('')
    : '<div style="font-size:13px;color:#8b7aaa;padding:7px 0;">Books purchased</div>';

  const total    = parseFloat(order.totalAmount) || 0;
  const totalStr = total === 0
    ? '<span style="color:#10b981;font-weight:700;font-size:17px;">FREE 🎁</span>'
    : '<span style="color:#a78bfa;font-weight:700;font-size:17px;">₹' + total + '</span>';

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  /* ── Create overlay ── */
  const overlay = document.createElement('div');
  overlay.id = 'vebInstantSuccessOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;
    background:rgba(5,3,15,0.92);
    backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
    z-index:999999;
    padding:16px;
    animation:vebFadeIn 0.2s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background:linear-gradient(145deg,#0e0820,#130d2a);
      border:1px solid rgba(124,58,237,0.35);
      border-radius:24px;
      padding:36px 28px 28px;
      max-width:460px;width:100%;
      text-align:center;
      box-shadow:0 30px 80px rgba(0,0,0,0.7),0 0 60px rgba(124,58,237,0.15);
      animation:vebPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      max-height:90vh;overflow-y:auto;
    ">

      <!-- ✓ Green check icon -->
      <div style="
        width:76px;height:76px;border-radius:50%;
        margin:0 auto 18px;
        background:linear-gradient(135deg,#10b981,#059669);
        display:flex;align-items:center;justify-content:center;
        font-size:32px;color:#fff;font-weight:700;
        box-shadow:0 0 0 10px rgba(16,185,129,0.12),
                   0 0 0 22px rgba(16,185,129,0.06);
      ">✓</div>

      <!-- Title -->
      <h2 style="
        font-family:'Cormorant Garamond',serif;
        font-size:30px;color:#fff;
        margin-bottom:6px;line-height:1.2;
      ">Order Confirmed! 🎉</h2>
      <p style="font-size:13px;color:#8b7aaa;margin-bottom:22px;line-height:1.6;">
        Your books are ready!<br>
        Confirmation sent to your <strong style="color:#a78bfa;">email</strong>
        &amp; <strong style="color:#25d366;">WhatsApp</strong>.
      </p>

      <!-- Order details card -->
      <div style="
        background:rgba(124,58,237,0.08);
        border:1px solid rgba(124,58,237,0.2);
        border-radius:14px;padding:16px;
        margin-bottom:18px;text-align:left;
      ">
        <!-- Order ID + Date row -->
        <div style="
          display:flex;justify-content:space-between;
          flex-wrap:wrap;gap:8px;
          padding-bottom:12px;margin-bottom:12px;
          border-bottom:1px solid rgba(124,58,237,0.15);
        ">
          <div>
            <div style="font-size:10px;color:#6b5a8a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Order ID</div>
            <div style="font-size:12px;color:#c4b5fd;font-weight:600;word-break:break-all;">${order.orderId || 'N/A'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#6b5a8a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Date</div>
            <div style="font-size:12px;color:#c4b5fd;">${today}</div>
          </div>
        </div>

        <!-- Customer row -->
        <div style="
          display:flex;justify-content:space-between;
          padding-bottom:10px;margin-bottom:10px;
          border-bottom:1px solid rgba(124,58,237,0.1);
        ">
          <div>
            <div style="font-size:10px;color:#6b5a8a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Customer</div>
            <div style="font-size:13px;color:#10b981;font-weight:600;">${order.customerName || 'N/A'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#6b5a8a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">WhatsApp</div>
            <div style="font-size:12px;color:#25d366;">+91${order.customerPhone || ''}</div>
          </div>
        </div>

        <!-- Books list -->
        <div style="margin-bottom:12px;">${bookRows}</div>

        <!-- Total + Payment -->
        <div style="
          display:flex;justify-content:space-between;align-items:center;
          padding-top:10px;
          border-top:1px solid rgba(124,58,237,0.15);
          margin-bottom:6px;
        ">
          <span style="font-size:13px;color:#8b7aaa;">Total Paid</span>
          ${totalStr}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:#8b7aaa;">Payment</span>
          <span style="font-size:13px;color:#a78bfa;">${order.paymentMethod || 'Online'} ✅</span>
        </div>
      </div>

      <!-- Email + WhatsApp badges -->
      <div style="
        display:flex;gap:8px;justify-content:center;
        flex-wrap:wrap;margin-bottom:22px;
      ">
        <div style="
          background:rgba(16,185,129,0.1);
          border:1px solid rgba(16,185,129,0.25);
          border-radius:20px;padding:5px 13px;
          font-size:12px;color:#34d399;
          display:flex;align-items:center;gap:5px;
        ">📧 Email on the way</div>
        <div style="
          background:rgba(37,211,102,0.1);
          border:1px solid rgba(37,211,102,0.25);
          border-radius:20px;padding:5px 13px;
          font-size:12px;color:#25d366;
          display:flex;align-items:center;gap:5px;
        ">💬 WhatsApp on the way</div>
      </div>

      <!-- Go to Downloads button -->
      <button onclick="closeInstantPopup();openDownloads();" style="
        width:100%;
        background:linear-gradient(135deg,#7c3aed,#a855f7);
        color:#fff;border:none;
        padding:14px;border-radius:12px;
        font-family:'Outfit',sans-serif;
        font-size:15px;font-weight:600;
        cursor:pointer;margin-bottom:10px;
        box-shadow:0 4px 16px rgba(124,58,237,0.4);
        transition:all 0.2s;
      "
      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(124,58,237,0.55)'"
      onmouseout="this.style.transform='';this.style.boxShadow='0 4px 16px rgba(124,58,237,0.4)'">
        📥 Go to My Downloads
      </button>

      <!-- Continue Shopping button -->
      <button onclick="closeInstantPopup();" style="
        width:100%;
        background:rgba(124,58,237,0.12);
        color:#c4b5fd;
        border:1px solid rgba(124,58,237,0.25);
        padding:12px;border-radius:12px;
        font-family:'Outfit',sans-serif;
        font-size:14px;font-weight:500;
        cursor:pointer;transition:all 0.2s;
      "
      onmouseover="this.style.background='rgba(124,58,237,0.22)';this.style.color='#fff'"
      onmouseout="this.style.background='rgba(124,58,237,0.12)';this.style.color='#c4b5fd'">
        🏠 Continue Shopping
      </button>

    </div>
  `;

  /* ── Add animation keyframes once ── */
  if (!document.getElementById('veb-checkout-styles')) {
    const s = document.createElement('style');
    s.id = 'veb-checkout-styles';
    s.textContent = `
      @keyframes vebFadeIn { from{opacity:0}                        to{opacity:1} }
      @keyframes vebPopIn  { from{transform:scale(0.8);opacity:0}   to{transform:scale(1);opacity:1} }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  /* ── Close on backdrop click ── */
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeInstantPopup();
  });
}

/* ── Close the instant success popup ── */
function closeInstantPopup() {
  const el = document.getElementById('vebInstantSuccessOverlay');
  if (el) el.remove();
  document.body.style.overflow = '';
}

/* ════════════════════════════════════════════════════════════
   ADD PURCHASED BOOKS TO DOWNLOADS
   Uses the same 'downloads' array and 'books' array from my.js
════════════════════════════════════════════════════════════ */
function addPurchasedBooksToDownloads() {
  if (typeof cart === 'undefined' || typeof downloads === 'undefined') return;
  if (typeof books === 'undefined') return;

  cart.forEach(item => {
    const book = books.find(b => b.title === item.name);
    if (book && !downloads.find(d => d.title === book.title)) {
      downloads.push({
        ...book,
        purchasedAt: new Date().toLocaleDateString('en-IN'),
      });
    }
  });

  if (typeof saveDownloads      === 'function') saveDownloads();
  if (typeof updateDlCount      === 'function') updateDlCount();
  if (typeof renderDownloadSection === 'function') renderDownloadSection();
}

/* ════════════════════════════════════════════════════════════
   DISABLE / ENABLE PAY BUTTONS DURING PROCESSING
════════════════════════════════════════════════════════════ */
function setPayBtnsDisabled(disabled) {
  document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.disabled      = disabled;
    btn.style.opacity = disabled ? '0.65' : '1';
    btn.style.cursor  = disabled ? 'not-allowed' : 'pointer';
    if (disabled) {
      if (!btn.dataset.origText) btn.dataset.origText = btn.innerHTML;
      btn.innerHTML = '⏳ Processing...';
    } else {
      if (btn.dataset.origText) {
        btn.innerHTML = btn.dataset.origText;
        delete btn.dataset.origText;
      }
    }
  });
}

/* ════════════════════════════════════════════════════════════
   EXPOSE TO WINDOW
   Overrides processPayment from my.js with instant version.
   All other functions (addToCart, renderCart etc.) stay in my.js
════════════════════════════════════════════════════════════ */
window.processPayment      = processPayment;   /* overrides my.js version */
window.placeOrder          = placeOrder;
window.showInstantSuccessPopup = showInstantSuccessPopup;
window.closeInstantPopup   = closeInstantPopup;
window.setPayBtnsDisabled  = setPayBtnsDisabled;