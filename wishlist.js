// Wishlist.js — Heart Buttons, Wishlist, Recommendations
import { auth, db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ ADD book to wishlist
export async function addToWishlist(bookId, bookData) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to save books to your wishlist! 📚");
    return;
  }
  try {
    await setDoc(doc(db, "wishlists", user.uid, "books", bookId), bookData);
    console.log("Added to wishlist:", bookId);
  } catch (error) {
    console.error("Error adding to wishlist:", error);
  }
}

// ✅ REMOVE book from wishlist
export async function removeFromWishlist(bookId) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await deleteDoc(doc(db, "wishlists", user.uid, "books", bookId));
    console.log("Removed from wishlist:", bookId);
  } catch (error) {
    console.error("Error removing from wishlist:", error);
  }
}

// ✅ LOAD wishlist from Firestore
export async function loadWishlist() {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const snapshot = await getDocs(collection(db, "wishlists", user.uid, "books"));
    const books = [];
    snapshot.forEach(doc => books.push({ id: doc.id, ...doc.data() }));
    return books;
  } catch (error) {
    console.error("Error loading wishlist:", error);
    return [];
  }
}

// ✅ RENDER wishlist on wishlist.html page
async function renderWishlist() {
  const container = document.getElementById("wishlistContainer");
  if (!container) return;

  const books = await loadWishlist();
  container.innerHTML = "";

  if (books.length === 0) {
    container.innerHTML = "<p>Your wishlist is empty. Start adding books! 💛</p>";
    return;
  }

  books.forEach(book => {
    const card = document.createElement("div");
    card.className = "wishlist-card";
    card.innerHTML = `
      <img src="${book.image || 'placeholder.jpg'}" alt="${book.title}" style="width:100px;" />
      <h3>${book.title}</h3>
      <p>${book.author || ""}</p>
      <p><strong>₹${book.price || ""}</strong></p>
      <button onclick="removeFromWishlist('${book.id}'); this.closest('.wishlist-card').remove();">
        💔 Remove
      </button>
    `;
    container.appendChild(card);
  });
}

// ✅ HEART BUTTONS — attach to all .heartBtn elements
function attachHeartButtons() {
  document.querySelectorAll(".heartBtn").forEach(btn => {
    const bookId = btn.dataset.id;
    const bookData = {
      title: btn.dataset.title || "Unknown Title",
      author: btn.dataset.author || "",
      price: btn.dataset.price || "",
      image: btn.dataset.image || ""
    };

    btn.addEventListener("click", () => {
      const isWishlisted = btn.classList.toggle("wishlisted");
      btn.textContent = isWishlisted ? "❤️" : "🤍";
      if (isWishlisted) {
        addToWishlist(bookId, bookData);
      } else {
        removeFromWishlist(bookId);
      }
    });
  });
}

// ✅ RECOMMENDATIONS — show 3 random books from wishlist
async function showRecommendations() {
  const container = document.getElementById("recommendationsContainer");
  if (!container) return;

  const books = await loadWishlist();
  if (books.length === 0) return;

  const recommended = books.sort(() => 0.5 - Math.random()).slice(0, 3);
  container.innerHTML = "<h3>📖 Recommended for You</h3>";
  recommended.forEach(book => {
    const item = document.createElement("div");
    item.innerHTML = `<p>⭐ ${book.title}</p>`;
    container.appendChild(item);
  });
}

// ✅ INIT — run everything when page loads
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      attachHeartButtons();
      renderWishlist();
      showRecommendations();
    }
  });
});