const API = "https://virtual-e-book-store.onrender.com";

// ═══════════════════════════════════════════════════════
// EMAILJS KEYS — Go to emailjs.com and replace these
// ═══════════════════════════════════════════════════════
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";
const EMAILJS_CONTACT_TID = "YOUR_TEMPLATE_ID";
const EMAILJS_ORDER_TID   = "YOUR_TEMPLATE_ID";

// Safe EmailJS init
try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e) {}

let cart          = JSON.parse(localStorage.getItem("ebookCart")      || "[]");
let downloads     = JSON.parse(localStorage.getItem("ebookDownloads") || "[]");
let books         = [];
let adminLoggedIn = false;
let currentFilter = "all";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function restoreLoginState() {}

function setupFadeObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  loadBooks();
  renderDownloadSection();
  updateCartCount();
  updateDlCount();
  setupFadeObserver();
});

// ═══════════════════════════════════════════════════════
// LOAD BOOKS FROM BACKEND
// ═══════════════════════════════════════════════════════
async function loadBooks() {
  try {
    const res = await fetch(`${API}/api/books`);
    books = await res.json();
    if (!Array.isArray(books) || books.length === 0) {
      books = getDefaultBooks();
      for (let book of books) {
        await fetch(`${API}/api/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(book)
        }).catch(() => {});
      }
      const res2 = await fetch(`${API}/api/books`).catch(() => null);
      if (res2 && res2.ok) books = await res2.json();
    }
  } catch {
    console.log("Backend offline — using local data");
    books = getDefaultBooks();
  }
  renderBooks();
  renderDownloadSection();
  setupFadeObserver();
}

function getDefaultBooks() {
  return [
    { title: "Data Structures & Algorithms", author: "Cormen, Leiserson", price: 299, tag: "premium", rating: "4.9", reviews: "2.3k", img: "https://m.media-amazon.com/images/I/41T7PmhE+hL._SY445_SX342_.jpg", downloadUrl: "#", adminAdded: false },
    { title: "Operating Systems Concepts",   author: "Silberschatz",      price: 0,   tag: "free",    rating: "4.7", reviews: "1.8k", img: "https://m.media-amazon.com/images/I/51Qy2upM+aL._SY445_SX342_.jpg", downloadUrl: "#", adminAdded: false },
    { title: "Python for Data Science",      author: "Wes McKinney",      price: 249, tag: "new",     rating: "4.8", reviews: "3.1k", img: "https://m.media-amazon.com/images/I/41bSVpNmEAL._SY445_SX342_.jpg", downloadUrl: "#", adminAdded: false },
    { title: "Database Management Systems",  author: "Ramakrishnan",      price: 349, tag: "premium", rating: "4.6", reviews: "1.5k", img: "https://m.media-amazon.com/images/I/51eL4eq+prL._SY445_SX342_.jpg", downloadUrl: "#", adminAdded: false },
    { title: "Computer Networks",            author: "Andrew Tanenbaum",  price: 0,   tag: "free",    rating: "4.8", reviews: "2.7k", img: "https://m.media-amazon.com/images/I/41XiZXHkKIL._SY445_SX342_.jpg", downloadUrl: "#", adminAdded: false },
    { title: "Machine Learning with Python", author: "Sebastian Raschka", price: 399, tag: "new",     rating: "4.9", reviews: "4.2k", img: "https://m.media-amazon.com/images/I/51Rz1wZQqYL._SY445_SX342_.jpg", downloadUrl: "#", adminAdded: false }
  ];
}

function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "show " + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = "", 3200);
}

window.addEventListener("scroll", () => {
  const btt = document.getElementById("btt");
  if (btt) btt.classList.toggle("show", window.scrollY > 300);
});

function toggleNav() {
  document.getElementById("navMenu").classList.toggle("open");
}

function openModal(id)  { document.getElementById(id).classList.add("open");    }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.addEventListener("click", e => {
      if (e.target === m) m.classList.remove("open");
    });
  });
});

// ═══════════════════════════════════════════════════════
// RENDER BOOKS
// ═══════════════════════════════════════════════════════
function renderBooks(filter) {
  filter = filter || currentFilter;
  const grid = document.getElementById("booksGrid");
  if (!grid) return;
  const filtered = filter === "all" ? books : books.filter(b => b.tag === filter);
  if (!filtered.length) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);grid-column:1/-1">
      <span style="font-size:48px">📚</span>
      <p style="margin-top:12px">No books found!</p>
    </div>`;
    return;
  }
  grid.innerHTML = filtered.map(book => {
    const tagLabel  = book.tag === "free" ? "Free 🎁" : book.tag === "premium" ? "Premium 💎" : "New ✨";
    const priceHtml = book.price === 0
      ? `<span class="free">FREE</span>`
      : `₹${book.price} <small>/ book</small>`;
    return `
    <div class="book-card fade-up" data-tag="${book.tag}">
      <div class="book-cover">
        <img src="${book.img}" alt="${book.title}"
          onerror="this.src='https://placehold.co/230x200/241748/a78bfa?text=Book'">
        <span class="book-tag tag-${book.tag}">${tagLabel}</span>
      </div>
      <div class="book-info">
        <h4>${book.title}</h4>
        <p class="book-author">by ${book.author}</p>
        <p class="book-rating"><span class="star">★</span> ${book.rating} (${book.reviews} reviews)</p>
        <div class="book-bottom">
          <div class="book-price">${priceHtml}</div>
          <div class="book-actions">
            ${book.price === 0
              ? `<button class="dl-quick-btn" onclick='quickDownload(${JSON.stringify(book)})'><i class="bx bx-download"></i></button>`
              : `<button class="add-cart-btn" onclick='addToCart(${JSON.stringify(book)}, this)'>+ Cart</button>`
            }
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
  setupFadeObserver();
}

function filterBooks(tag, btn) {
  currentFilter = tag;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderBooks(tag);
}

function searchBooks() {
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  document.querySelectorAll(".book-card").forEach(c => {
    const title  = c.querySelector("h4")?.textContent.toLowerCase()           || "";
    const author = c.querySelector(".book-author")?.textContent.toLowerCase() || "";
    c.style.display = title.includes(q) || author.includes(q) ? "" : "none";
  });
}

// ═══════════════════════════════════════════════════════
// CART FUNCTIONS
// ═══════════════════════════════════════════════════════
function toggleCart() {
  document.getElementById("cartSidebar").classList.toggle("open");
  document.getElementById("cartOverlay").classList.toggle("open");
  renderCart();
}

function addToCart(book, btn) {
  const ex = cart.find(i => i.name === book.title);
  if (ex) { ex.qty++; }
  else { cart.push({ name: book.title, price: book.price, img: book.img, qty: 1 }); }
  saveCart();
  updateCartCount();
  showToast("📚 " + book.title + " added to cart!", "success");
  if (btn) {
    btn.textContent = "✅ Added";
    btn.classList.add("added");
    setTimeout(() => { btn.textContent = "+ Cart"; btn.classList.remove("added"); }, 1500);
  }
}

function renderCart() {
  const body    = document.getElementById("cartBody");
  const total   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalEl = document.getElementById("cartTotal");
  if (totalEl) totalEl.textContent = total === 0 ? "FREE" : "₹" + total;
  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty"><span>📚</span><p>Your cart is empty!</p></div>`;
    return;
  }
  body.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <img src="${item.img}" alt="${item.name}"
        onerror="this.src='https://placehold.co/56x72/241748/a78bfa?text=Book'">
      <div class="ci-info">
        <h4>${item.name}</h4>
        <p>${item.price === 0 ? "🎁 FREE" : "₹" + item.price}</p>
        <div class="ci-bottom">
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
            <span class="qty-n">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
          </div>
          <button class="rm-btn" onclick="removeItem(${i})">🗑</button>
        </div>
      </div>
    </div>`).join("");
}

function changeQty(i, d) {
  cart[i].qty += d;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  saveCart(); renderCart(); updateCartCount();
}

function removeItem(i) {
  const n = cart[i].name;
  cart.splice(i, 1);
  saveCart(); renderCart(); updateCartCount();
  showToast("🗑 " + n + " removed", "info");
}

function saveCart() { localStorage.setItem("ebookCart", JSON.stringify(cart)); }

function updateCartCount() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById("cartCount");
  if (el) { el.textContent = total; el.style.display = total > 0 ? "flex" : "none"; }
}

// ═══════════════════════════════════════════════════════
// CHECKOUT
// ═══════════════════════════════════════════════════════
function openCheckout() {
  if (!cart.length) { showToast("🛒 Cart is empty!", "error"); return; }
  const items = cart.map(i => `
    <div class="summary-row">
      <span>${i.name} × ${i.qty}</span>
      <span>${i.price === 0 ? "FREE" : "₹" + (i.price * i.qty)}</span>
    </div>`).join("");
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById("summaryItems").innerHTML = items;
  document.getElementById("summaryTotal").textContent = total === 0 ? "FREE" : "₹" + total;
  document.getElementById("cartSidebar").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
  openModal("payModal");
}

function switchPay(type, btn) {
  document.querySelectorAll(".pay-tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".pay-content").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("pay-" + type).classList.add("active");
}

// ═══════════════════════════════════════════════════════
// PROCESS PAYMENT
// ═══════════════════════════════════════════════════════
async function processPayment(method) {
  const customerName  = document.getElementById("customerName")?.value.trim();
  const customerEmail = document.getElementById("customerEmail")?.value.trim();
  const customerPhone = document.getElementById("customerPhone")?.value.trim();

  if (!customerName)  { showToast("❌ Please enter your name!", "error"); return; }
  if (!customerEmail || !isValidEmail(customerEmail)) {
    showToast("❌ Please enter valid email!", "error"); return;
  }
  // FIX (Bug 4): Accept 10-digit numbers (server normalizes +91 automatically)
  if (!customerPhone || customerPhone.replace(/\D/g, "").length < 10) {
    showToast("❌ Please enter valid 10-digit WhatsApp number!", "error"); return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // ── COD ──────────────────────────────────────────────
  if (method === "Cash on Delivery") {
    const codEmail = document.getElementById("codEmail")?.value.trim();
    if (!codEmail || !isValidEmail(codEmail)) {
      showToast("❌ Enter valid COD email!", "error"); return;
    }
    closeModal("payModal");
    await saveRazorpayOrder(method, "COD-" + Date.now(), customerName, customerEmail, customerPhone, total);
    return;
  }

  // ── FREE books — instant success ─────────────────────
  if (total === 0) {
    closeModal("payModal");
    await saveRazorpayOrder(method, "FREE-" + Date.now(), customerName, customerEmail, customerPhone, 0);
    return;
  }

  // ── PAID — open Razorpay popup ───────────────────────
  try {
    closeModal("payModal");
    const options = {
      key:         "rzp_live_SYKdilpCIN2G9A",
      amount:      total * 100,
      currency:    "INR",
      name:        "Virtual E-Book Store",
      description: "Book Purchase",
      prefill:     { name: customerName, email: customerEmail, contact: customerPhone },
      theme:       { color: "#7c3aed" },
      handler: async function(response) {
        const paymentId = response.razorpay_payment_id || "PAY-" + Date.now();
        await saveRazorpayOrder(method, paymentId, customerName, customerEmail, customerPhone, total);
      },
      modal: {
        ondismiss: () => showToast("❌ Payment cancelled!", "error")
      }
    };
    new Razorpay(options).open();
  } catch (err) {
    console.error("Payment error:", err);
    showToast("❌ Something went wrong! Try COD instead.", "error");
    openModal("payModal");
  }
}

// ═══════════════════════════════════════════════════════
// SAVE ORDER
// FIX (Bug 3): Snapshot cart BEFORE clearing it
// FIX (Bug 1): Pass the snapshot to showInstantSuccessPopup
// FIX (Bug 2): Pass snapshot to sendOrderConfirmationEmail
// ═══════════════════════════════════════════════════════
async function saveRazorpayOrder(method, paymentId, customerName, customerEmail, customerPhone, total) {
  try {

    // ══ STEP 1: Snapshot cart NOW before anything clears it ══
    // FIX Bug 3 + Bug 1 + Bug 2: Save a deep copy of cart at this moment
    const cartSnapshot = JSON.parse(JSON.stringify(cart));

    // ══ STEP 2: Save order to backend ══════════════════
    const res = await fetch(`${API}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        books:         cartSnapshot.map(i => ({ title: i.name, price: i.price, qty: i.qty })),
        totalAmount:   total,
        paymentMethod: method,
        orderId:       paymentId,
        status:        "completed",
        customerName,
        customerEmail,
        customerPhone,
      })
    });

    // ══ STEP 3: Add books to downloads ═════════════════
    cartSnapshot.forEach(item => {
      const book = books.find(b => b.title === item.name);
      if (book && !downloads.find(d => d.title === book.title)) {
        downloads.push({ ...book, purchasedAt: new Date().toLocaleDateString("en-IN") });
      }
    });
    saveDownloads();
    updateDlCount();
    renderDownloadSection();

    // ══ STEP 4: Clear cart ══════════════════════════════
    cart = [];
    saveCart();
    renderCart();
    updateCartCount();

    // ══ STEP 5: ⚡ SHOW POPUP with the snapshot ═════════
    // FIX Bug 1: Pass cartSnapshot (not empty cart) so book list shows correctly
    showInstantSuccessPopup({
      orderId:       paymentId,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod: method,
      totalAmount:   total,
      books:         cartSnapshot.map(i => ({ title: i.name, price: i.price, qty: i.qty })),
    });

    showToast("✅ Order placed successfully!", "success");

    // ══ STEP 6: Send EmailJS in background ═════════════
    // FIX Bug 2: Pass cartSnapshot directly — no longer reads from missing localStorage key
    sendOrderConfirmationEmail(
      customerName, customerEmail, paymentId, method, total,
      cartSnapshot
    );

  } catch (err) {
    // Even on network error — show popup so customer isn't left hanging
    console.error("Order save error:", err);

    // Snapshot may be gone if error was before we made it — use whatever cart still has
    const emergencySnapshot = JSON.parse(JSON.stringify(cart));

    showInstantSuccessPopup({
      orderId:       paymentId,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod: method,
      totalAmount:   total,
      books:         emergencySnapshot.map(i => ({ title: i.name, price: i.price, qty: i.qty })),
    });
    showToast("✅ Order placed!", "success");
    cart = [];
    saveCart();
    renderCart();
    updateCartCount();
  }
}

// ═══════════════════════════════════════════════════════
// ⚡ INSTANT SUCCESS POPUP
// ═══════════════════════════════════════════════════════
function showInstantSuccessPopup(order) {

  // Remove any old popup
  const old = document.getElementById("vebSuccessOverlay");
  if (old) old.remove();

  const total    = parseFloat(order.totalAmount) || 0;
  const totalStr = total === 0
    ? '<span style="color:#10b981;font-weight:700;">FREE 🎁</span>'
    : '<span style="color:#a78bfa;font-weight:700;">₹' + total + '</span>';

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric"
  });

  const items = order.books && order.books.length > 0 ? order.books : [];

  const bookRows = items.length > 0
    ? items.map(b => {
        const price = parseFloat(b.price) || 0;
        return `
          <div style="
            display:flex;align-items:center;justify-content:space-between;
            gap:10px;padding:7px 0;
            border-bottom:1px solid rgba(124,58,237,0.1);
          ">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;">
              <span style="font-size:16px;flex-shrink:0;">📚</span>
              <span style="font-size:13px;color:#c4b5fd;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${b.title || b.name || "Book"} ${(b.qty||1) > 1 ? "×"+(b.qty||1) : ""}
              </span>
            </div>
            <span style="font-size:13px;font-weight:700;flex-shrink:0;
              color:${price === 0 ? "#10b981" : "#a78bfa"};">
              ${price === 0 ? "FREE" : "₹"+(price*(b.qty||1))}
            </span>
          </div>`;
      }).join("")
    : '<div style="font-size:13px;color:#8b7aaa;padding:7px 0;">Books purchased successfully</div>';

  const overlay = document.createElement("div");
  overlay.id = "vebSuccessOverlay";
  overlay.style.cssText = `
    position:fixed;inset:0;
    background:rgba(5,3,15,0.92);
    backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
    z-index:999999;padding:16px;
    animation:vebFadeIn 0.2s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background:linear-gradient(145deg,#0e0820,#130d2a);
      border:1px solid rgba(124,58,237,0.35);
      border-radius:24px;padding:36px 28px 28px;
      max-width:460px;width:100%;text-align:center;
      box-shadow:0 30px 80px rgba(0,0,0,0.7),0 0 60px rgba(124,58,237,0.15);
      animation:vebPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      max-height:90vh;overflow-y:auto;
    ">

      <!-- Check icon -->
      <div style="
        width:76px;height:76px;border-radius:50%;margin:0 auto 18px;
        background:linear-gradient(135deg,#10b981,#059669);
        display:flex;align-items:center;justify-content:center;
        font-size:32px;color:#fff;font-weight:700;
        box-shadow:0 0 0 10px rgba(16,185,129,0.12),0 0 0 22px rgba(16,185,129,0.06);
      ">✓</div>

      <h2 style="font-family:'Cormorant Garamond',serif;font-size:30px;color:#fff;margin-bottom:6px;">
        Order Confirmed! 🎉
      </h2>
      <p style="font-size:13px;color:#8b7aaa;margin-bottom:22px;line-height:1.6;">
        Your books are ready!<br>
        Confirmation sent to your
        <strong style="color:#a78bfa;">${order.customerEmail || "email"}</strong>
        &amp; <strong style="color:#25d366;">WhatsApp</strong>.
      </p>

      <!-- Details card -->
      <div style="
        background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);
        border-radius:14px;padding:16px;margin-bottom:18px;text-align:left;
      ">
        <!-- Order ID + Date -->
        <div style="
          display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;
          padding-bottom:12px;margin-bottom:12px;
          border-bottom:1px solid rgba(124,58,237,0.15);
        ">
          <div>
            <div style="font-size:10px;color:#6b5a8a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Order ID</div>
            <div style="font-size:12px;color:#c4b5fd;font-weight:600;word-break:break-all;">${order.orderId || "N/A"}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#6b5a8a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Date</div>
            <div style="font-size:12px;color:#c4b5fd;">${today}</div>
          </div>
        </div>

        <!-- Customer + Phone -->
        <div style="
          display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;
          padding-bottom:10px;margin-bottom:10px;
          border-bottom:1px solid rgba(124,58,237,0.1);
        ">
          <div>
            <div style="font-size:10px;color:#6b5a8a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Customer</div>
            <div style="font-size:13px;color:#10b981;font-weight:600;">${order.customerName || "N/A"}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#6b5a8a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">WhatsApp</div>
            <div style="font-size:12px;color:#25d366;">${order.customerPhone || "N/A"}</div>
          </div>
        </div>

        <!-- Books -->
        <div style="margin-bottom:12px;">${bookRows}</div>

        <!-- Total + Payment -->
        <div style="
          display:flex;justify-content:space-between;align-items:center;
          padding-top:10px;border-top:1px solid rgba(124,58,237,0.15);margin-bottom:6px;
        ">
          <span style="font-size:13px;color:#8b7aaa;">Total Paid</span>
          ${totalStr}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:#8b7aaa;">Payment</span>
          <span style="font-size:13px;color:#a78bfa;">${order.paymentMethod || "Online"} ✅</span>
        </div>
      </div>

      <!-- Notification badges -->
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:22px;">
        <div style="
          background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);
          border-radius:20px;padding:5px 13px;font-size:12px;color:#34d399;
          display:flex;align-items:center;gap:5px;">📧 Email on the way</div>
        <div style="
          background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.25);
          border-radius:20px;padding:5px 13px;font-size:12px;color:#25d366;
          display:flex;align-items:center;gap:5px;">💬 WhatsApp on the way</div>
      </div>

      <!-- Buttons -->
      <button onclick="closeInstantPopup();openDownloads();" style="
        width:100%;background:linear-gradient(135deg,#7c3aed,#a855f7);
        color:#fff;border:none;padding:14px;border-radius:12px;
        font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;
        cursor:pointer;margin-bottom:10px;
        box-shadow:0 4px 16px rgba(124,58,237,0.4);transition:all 0.2s;
      "
      onmouseover="this.style.transform='translateY(-2px)'"
      onmouseout="this.style.transform=''">
        📥 Go to My Downloads
      </button>
      <button onclick="closeInstantPopup();" style="
        width:100%;background:rgba(124,58,237,0.12);color:#c4b5fd;
        border:1px solid rgba(124,58,237,0.25);padding:12px;border-radius:12px;
        font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;
        cursor:pointer;transition:all 0.2s;
      "
      onmouseover="this.style.background='rgba(124,58,237,0.22)';this.style.color='#fff'"
      onmouseout="this.style.background='rgba(124,58,237,0.12)';this.style.color='#c4b5fd'">
        🏠 Continue Shopping
      </button>
    </div>
  `;

  // Add animations once
  if (!document.getElementById("veb-popup-anim")) {
    const s = document.createElement("style");
    s.id = "veb-popup-anim";
    s.textContent = `
      @keyframes vebFadeIn { from{opacity:0} to{opacity:1} }
      @keyframes vebPopIn  { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  // Close on backdrop click
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeInstantPopup();
  });
}

// Close popup
function closeInstantPopup() {
  const el = document.getElementById("vebSuccessOverlay");
  if (el) el.remove();
  document.body.style.overflow = "";
}

// ═══════════════════════════════════════════════════════
// SEND ORDER CONFIRMATION EMAIL — via EmailJS (background)
// FIX (Bug 2): Now receives cartItems directly as parameter
//              instead of reading from missing localStorage key
// ═══════════════════════════════════════════════════════
async function sendOrderConfirmationEmail(customerName, customerEmail, orderId, method, total, cartItems) {
  if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY" ||
      EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID") {
    console.log("EmailJS not configured yet — skipping email");
    return;
  }

  // cartItems is now the snapshot passed directly — always has data
  const bookList = (cartItems || []).map(i =>
    `${i.name || i.title} x${i.qty || 1} — ${i.price === 0 ? "FREE" : "₹" + ((i.price || 0) * (i.qty || 1))}`
  ).join("\n");

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_TID, {
      customer_name:  customerName,
      customer_email: customerEmail,
      order_id:       orderId,
      payment_method: method,
      total_amount:   total === 0 ? "FREE" : "₹" + total,
      book_list:      bookList || "Books purchased",
      order_date:     new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
      support_email:  "htgautam2003@gmail.com"
    });
    console.log("✅ Order confirmation email sent!");
  } catch (err) {
    console.warn("Order email failed silently:", err);
  }
}

// ═══════════════════════════════════════════════════════
// DOWNLOADS
// ═══════════════════════════════════════════════════════
function saveDownloads() { localStorage.setItem("ebookDownloads", JSON.stringify(downloads)); }

function updateDlCount() {
  const el = document.getElementById("dlCount");
  if (!el) return;
  el.textContent   = downloads.length;
  el.style.display = downloads.length > 0 ? "flex" : "none";
}

function quickDownload(book) {
  if (!downloads.find(d => d.title === book.title)) {
    downloads.push({ ...book, purchasedAt: new Date().toLocaleDateString("en-IN") });
    saveDownloads(); updateDlCount(); renderDownloadSection();
    showToast("📥 " + book.title + " added to library!", "success");
  }
  triggerDownload(book);
}

function triggerDownload(book) {
  if (!book.downloadUrl || book.downloadUrl === "#") {
    showToast("⚠️ Download link not available yet", "info"); return;
  }
  const a = document.createElement("a");
  a.href = book.downloadUrl; a.download = book.title + ".pdf"; a.target = "_blank";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  showToast("⬇️ Downloading: " + book.title, "success");
}

function renderDownloadSection() {
  const grid = document.getElementById("dlGrid");
  if (!grid) return;
  const freeBooks  = books.filter(b => b.price === 0);
  const allDlBooks = [...downloads];
  freeBooks.forEach(fb => { if (!allDlBooks.find(d => d.title === fb.title)) allDlBooks.push(fb); });
  if (!allDlBooks.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">
      <span style="font-size:48px;display:block;margin-bottom:12px">📭</span>
      <p>No books available for download yet</p>
    </div>`;
    return;
  }
  grid.innerHTML = allDlBooks.map(book => {
    const isPurchased = downloads.find(d => d.title === book.title);
    const canDownload = book.price === 0 || isPurchased;
    return `
    <div class="dl-card fade-up">
      <img class="dl-cover" src="${book.img}" alt="${book.title}"
        onerror="this.src='https://placehold.co/56x72/241748/a78bfa?text=Book'">
      <div class="dl-info">
        <h4>${book.title}</h4>
        <p>by ${book.author}</p>
        ${canDownload
          ? `<button class="dl-btn" onclick='triggerDownload(${JSON.stringify(book)})'><i class="bx bx-download"></i> Download PDF</button>`
          : `<span class="dl-locked">🔒 Purchase to unlock</span>`
        }
        ${isPurchased ? `<p style="font-size:11px;color:#10b981;margin-top:8px">✅ Purchased</p>` : ""}
      </div>
    </div>`;
  }).join("");
  setupFadeObserver();
}

function openDownloads() {
  const list = document.getElementById("downloadList");
  const none = document.getElementById("noDownloads");
  if (!downloads.length) { list.innerHTML = ""; none.style.display = "block"; }
  else {
    none.style.display = "none";
    list.innerHTML = downloads.map(book => `
      <div class="dm-item">
        <img src="${book.img}" alt="${book.title}"
          onerror="this.src='https://placehold.co/44x56/241748/a78bfa?text=Book'">
        <div class="dm-item-info">
          <h4>${book.title}</h4>
          <p>Purchased: ${book.purchasedAt || "N/A"}</p>
        </div>
        <button class="dm-dl-btn" onclick='triggerDownload(${JSON.stringify(book)})'><i class="bx bx-download"></i> PDF</button>
      </div>`).join("");
  }
  openModal("downloadModal");
}

// ═══════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════
function adminLogin() {
  const pass = document.getElementById("adminPass").value;
  if (pass === "admin123") {
    adminLoggedIn = true;
    document.getElementById("adminLogin").style.display = "none";
    document.getElementById("adminForm").style.display  = "block";
    showToast("🔓 Admin access granted!", "success");
  } else {
    showToast("❌ Wrong password!", "error");
    document.getElementById("adminPass").value = "";
  }
}

async function addNewBook() {
  const title       = document.getElementById("newTitle").value.trim();
  const author      = document.getElementById("newAuthor").value.trim();
  const imgInput    = document.getElementById("newImg").value.trim();
  const price       = parseInt(document.getElementById("newPrice").value) || 0;
  const tag         = document.getElementById("newTag").value;
  const rating      = parseFloat(document.getElementById("newRating").value) || 4.5;
  const downloadUrl = document.getElementById("newDownload").value.trim() || "#";
  if (!title || !author) { showToast("❌ Title and Author are required!", "error"); return; }
  const newBook = {
    title, author, price, tag,
    rating: rating.toFixed(1), reviews: "0",
    img: imgInput || "https://placehold.co/230x200/241748/a78bfa?text=Book",
    downloadUrl, adminAdded: true
  };
  try {
    await fetch(`${API}/api/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBook)
    });
    showToast("✅ Book saved to database!", "success");
  } catch { showToast("⚠️ Saved locally only!", "info"); }
  await loadBooks();
  ["newTitle","newAuthor","newImg","newPrice","newRating","newDownload"]
    .forEach(id => document.getElementById(id).value = "");
  closeModal("adminModal");
  setTimeout(() => {
    document.getElementById("adminLogin").style.display = "block";
    document.getElementById("adminForm").style.display  = "none";
    document.getElementById("adminPass").value          = "";
    adminLoggedIn = false;
  }, 500);
}

// ═══════════════════════════════════════════════════════
// CONTACT FORM
// ═══════════════════════════════════════════════════════
function sendContact() {
  const name  = document.getElementById("cName").value.trim();
  const email = document.getElementById("cEmail").value.trim();
  const phone = document.getElementById("cPhone").value.trim();
  const msg   = document.getElementById("cMsg").value.trim();
  const btn   = document.getElementById("contactSubmitBtn");
  const msgEl = document.getElementById("contactMsg");
  msgEl.className = "contact-msg"; msgEl.style.display = "none";
  if (!name)                { showContactMsg("⚠️ Please enter your name.", "error");     return; }
  if (!isValidEmail(email)) { showContactMsg("⚠️ Please enter a valid email.", "error"); return; }
  if (!msg)                 { showContactMsg("⚠️ Please write a message.", "error");     return; }

  if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
    showContactMsg("✅ Message received! Email us at htgautam2003@gmail.com", "success");
    return;
  }

  btn.textContent = "⏳ Sending..."; btn.disabled = true;
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CONTACT_TID, {
    from_name:  name,
    from_email: email,
    phone:      phone || "Not provided",
    message:    msg,
    to_email:   "htgautam2003@gmail.com"
  })
  .then(() => {
    showContactMsg("✅ Message sent! We'll reply within 24 hours.", "success");
    ["cName","cEmail","cPhone","cMsg"].forEach(id => document.getElementById(id).value = "");
    btn.textContent = "📨 Send Message"; btn.disabled = false;
  })
  .catch(err => {
    console.error("Contact email error:", err);
    showContactMsg("❌ Failed to send. Email us at htgautam2003@gmail.com", "error");
    btn.textContent = "📨 Send Message"; btn.disabled = false;
  });
}

function showContactMsg(text, type) {
  const el = document.getElementById("contactMsg");
  if (!el) return;
  el.textContent = text; el.className = "contact-msg " + type; el.style.display = "flex";
  if (type === "success") setTimeout(() => el.style.display = "none", 6000);
}

// ═══════════════════════════════════════════════════════
// NAV FUNCTIONS
// ═══════════════════════════════════════════════════════
function updateNavForUser(user) {
  const ab = document.getElementById("authBtns");
  const ud = document.getElementById("userDropdown");
  if (!ab || !ud) return;
  ab.style.display = "none";
  ud.style.display = "flex";
  ud.classList.add("visible");
  const initials = (user.name || "U").split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
  const avatarEl = document.getElementById("userAvatarInitial");
  const nameEl   = document.getElementById("userDisplayName");
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = (user.name || "").split(" ")[0];
}

function updateNavForGuest() {
  const ab = document.getElementById("authBtns");
  const ud = document.getElementById("userDropdown");
  if (ab) { ab.style.display = "flex"; ab.style.visibility = "visible"; ab.style.opacity = "1"; }
  if (ud) { ud.style.display = "none"; ud.classList.remove("visible"); }
}

document.addEventListener("DOMContentLoaded", () => {
  const cardNum = document.getElementById("cardNum");
  const cardExp = document.getElementById("cardExp");
  if (cardNum) cardNum.addEventListener("input", function() {
    this.value = this.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim();
  });
  if (cardExp) cardExp.addEventListener("input", function() {
    this.value = this.value.replace(/\D/g,"").replace(/(\d{2})(\d)/,"$1/$2");
  });
});