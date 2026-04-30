/* ════════════════════════════════════════════════════════════
   cart.js — Virtual E-Book Store
   Works WITH my.js — does NOT conflict or duplicate anything.

   my.js already handles:
     ✅ cart array (let cart = [...])
     ✅ addToCart()
     ✅ removeItem()
     ✅ changeQty()
     ✅ renderCart()
     ✅ toggleCart()
     ✅ saveCart()
     ✅ updateCartCount()
     ✅ openCheckout()

   cart.js adds only NEW features:
     ✅ getCartTotal()      — returns total amount (used by checkout.js)
     ✅ getCartItems()      — returns cart items in backend format
     ✅ clearCartCompletely() — clears cart after successful order
     ✅ getCartCount()      — returns total item count
     ✅ isCartEmpty()       — returns true if cart is empty
════════════════════════════════════════════════════════════ */

/* ── Get total amount of cart ── */
function getCartTotal() {
  /* Uses the same 'cart' array from my.js */
  if (typeof cart === 'undefined' || !Array.isArray(cart)) return 0;
  return cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
}

/* ── Get cart items formatted for backend API ── */
function getCartItems() {
  if (typeof cart === 'undefined' || !Array.isArray(cart)) return [];
  return cart.map(item => ({
    title: item.name  || item.title || 'Book',
    price: item.price || 0,
    qty:   item.qty   || 1,
    img:   item.img   || '',
  }));
}

/* ── Get total item count ── */
function getCartCount() {
  if (typeof cart === 'undefined' || !Array.isArray(cart)) return 0;
  return cart.reduce((sum, item) => sum + (item.qty || 1), 0);
}

/* ── Check if cart is empty ── */
function isCartEmpty() {
  if (typeof cart === 'undefined' || !Array.isArray(cart)) return true;
  return cart.length === 0;
}

/* ── Clear cart completely after successful order ── */
function clearCartCompletely() {
  /* Reset the same 'cart' variable from my.js */
  if (typeof cart !== 'undefined') {
    cart.length = 0; /* clear in place so my.js references still work */
  }
  localStorage.removeItem('ebookCart'); /* same key as my.js: "ebookCart" */

  /* Update all UI elements */
  if (typeof saveCart        === 'function') saveCart();
  if (typeof renderCart      === 'function') renderCart();
  if (typeof updateCartCount === 'function') updateCartCount();

  /* Reset cart count badge */
  const countEl = document.getElementById('cartCount');
  if (countEl) { countEl.textContent = '0'; countEl.style.display = 'none'; }
}

/* ── Expose to window ── */
window.getCartTotal        = getCartTotal;
window.getCartItems        = getCartItems;
window.getCartCount        = getCartCount;
window.isCartEmpty         = isCartEmpty;
window.clearCartCompletely = clearCartCompletely;