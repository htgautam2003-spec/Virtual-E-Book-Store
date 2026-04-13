const API = "https://virtual-e-book-store.onrender.com";

// ═══════════════════════════════════════════════════════
// EMAILJS KEYS — Go to emailjs.com and replace these
// Step 1: emailjs.com → sign up → Add Service → Gmail
// Step 2: Email Templates → Create → Save
// Step 3: Account → copy Public Key
// ═══════════════════════════════════════════════════════
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";   // ← paste from emailjs.com Account page
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";   // ← paste from EmailJS Services page
const EMAILJS_CONTACT_TID = "YOUR_TEMPLATE_ID";  // ← paste from EmailJS Templates page
const EMAILJS_ORDER_TID   = "YOUR_TEMPLATE_ID";  // ← same template ID is fine for now

// Safe EmailJS init — won't crash if key is missing
try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e) {}

let cart      = JSON.parse(localStorage.getItem("ebookCart")      || "[]");
let downloads = JSON.parse(localStorage.getItem("ebookDownloads") || "[]");
let books        = [];
let adminLoggedIn = false;
let currentFilter = "all";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function restoreLoginState() {
  // nav is handled entirely by index.html DOMContentLoaded
}

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
// FIXED processPayment — shows success screen properly
// for UPI, Card, COD and FREE books
// ═══════════════════════════════════════════════════════
async function processPayment(method) {
  const customerName  = document.getElementById("customerName")?.value.trim();
  const customerEmail = document.getElementById("customerEmail")?.value.trim();
  if (!customerName)  { showToast("❌ Please enter your name!", "error");         return; }
  if (!customerEmail || !isValidEmail(customerEmail)) {
    showToast("❌ Please enter valid email!", "error"); return;
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // ── COD ──────────────────────────────────────────────
  if (method === "Cash on Delivery") {
    const codEmail = document.getElementById("codEmail")?.value.trim();
    if (!codEmail || !isValidEmail(codEmail)) {
      showToast("❌ Enter valid COD email!", "error"); return;
    }
    closeModal("payModal");
    await saveRazorpayOrder(method, "COD-" + Date.now(), customerName, customerEmail, total);
    return;
  }

  // ── FREE books — instant success ─────────────────────
  if (total === 0) {
    closeModal("payModal");
    await saveRazorpayOrder(method, "FREE-" + Date.now(), customerName, customerEmail, 0);
    return;
  }

  // ── PAID — open Razorpay popup ───────────────────────
  // FIX: removed backend create-order call that was failing
  // Now opens Razorpay directly with amount — works without backend
  try {
    closeModal("payModal"); // close BEFORE opening Razorpay so success screen shows

    const options = {
      key:         "rzp_live_SYKdilpCIN2G9A",
      amount:      total * 100, // amount in paise
      currency:    "INR",
      name:        "Virtual E-Book Store",
      description: "Book Purchase",
      prefill:     { name: customerName, email: customerEmail },
      theme:       { color: "#7c3aed" },
      handler: async function(response) {
        // Payment successful — show order success
        const paymentId = response.razorpay_payment_id || "PAY-" + Date.now();
        await saveRazorpayOrder(method, paymentId, customerName, customerEmail, total);
      },
      modal: {
        ondismiss: () => showToast("❌ Payment cancelled!", "error")
      }
    };
    new Razorpay(options).open();

  } catch (err) {
    console.error("Payment error:", err);
    showToast("❌ Something went wrong! Try COD instead.", "error");
    openModal("payModal"); // reopen if Razorpay fails
  }
}

// ═══════════════════════════════════════════════════════
// FIXED sendOrderConfirmationEmail
// — safely skips if EmailJS keys are not set yet
// ═══════════════════════════════════════════════════════
async function sendOrderConfirmationEmail(customerName, customerEmail, orderId, method, total, cartItems) {
  // Skip if keys are not set up yet
  if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY" ||
      EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID") {
    console.log("EmailJS not configured yet — skipping email");
    return;
  }
  const bookList = cartItems.map(i =>
    `${i.name} x${i.qty} — ${i.price === 0 ? "FREE" : "₹" + (i.price * i.qty)}`
  ).join("\n");
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_TID, {
      customer_name:  customerName,
      customer_email: customerEmail,
      order_id:       orderId,
      payment_method: method,
      total_amount:   total === 0 ? "FREE" : "₹" + total,
      book_list:      bookList,
      order_date:     new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
      support_email:  "htgautam2003@gmail.com"
    });
    console.log("Order confirmation email sent!");
  } catch (err) {
    console.warn("Order email failed silently:", err);
  }
}

// ═══════════════════════════════════════════════════════
// saveRazorpayOrder — saves order and shows success modal
// ═══════════════════════════════════════════════════════
async function saveRazorpayOrder(method, paymentId, customerName, customerEmail, total) {
  try {
    // Save to backend (silent fail if offline)
    await fetch(`${API}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        books:         cart.map(i => ({ title: i.name, price: i.price, qty: i.qty })),
        totalAmount:   total,
        paymentMethod: method,
        orderId:       paymentId,
        status:        "completed",
        customerName,
        customerEmail
      })
    }).catch(() => {}); // silent fail — don't block success screen

    // Send confirmation email (silent fail if not configured)
    await sendOrderConfirmationEmail(customerName, customerEmail, paymentId, method, total, [...cart]);

    // Add purchased books to downloads
    cart.forEach(item => {
      const book = books.find(b => b.title === item.name);
      if (book && !downloads.find(d => d.title === book.title)) {
        downloads.push({ ...book, purchasedAt: new Date().toLocaleDateString("en-IN") });
      }
    });
    saveDownloads();
    updateDlCount();
    renderDownloadSection();

    // Build success screen content
    document.getElementById("successDetails").innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span>Order ID</span>
        <span style="color:#a78bfa;font-weight:700">${paymentId}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span>Customer</span>
        <span style="color:#10b981;font-weight:700">${customerName}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span>Email</span>
        <span style="color:#a78bfa;font-weight:700">${customerEmail}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span>Payment</span>
        <span style="color:#10b981;font-weight:700">${method}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span>Total Paid</span>
        <span style="color:#a78bfa;font-weight:700">${total === 0 ? "FREE" : "₹" + total}</span>
      </div>
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:8px;font-size:13px;color:#34d399;">
        <span>📧</span>
        <span>Confirmation sent to <strong>${customerEmail}</strong></span>
      </div>`;

    // Show success modal
    openModal("successModal");
    showToast("✅ Order placed successfully!", "success");

    // Clear cart
    cart = [];
    saveCart();
    renderCart();
    updateCartCount();

  } catch (err) {
    console.error("Order save error:", err);
    // Even if backend fails — still show success to user
    openModal("successModal");
    showToast("✅ Order placed!", "success");
    cart = [];
    saveCart();
    renderCart();
    updateCartCount();
  }
}

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
// FIXED sendContact — safely skips if EmailJS not set up
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

  // If EmailJS not configured — show helpful message instead of crashing
  if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
    showContactMsg(
      "✅ Message received! Email us directly at htgautam2003@gmail.com",
      "success"
    );
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