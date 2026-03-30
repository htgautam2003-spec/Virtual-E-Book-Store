async function loadBooks() {
  const res = await fetch("/api/books");
  const books = await res.json();

  let html = "<ul>";
  books.forEach(book => {
    html += `<li>
    <strong>${book.title}</strong> - ${book.author} ₹${book.price}
    [<a href="${book.downloadUrl}" target="_blank">Read</a>]
    <button onclick="buyBook('${book.title}', ${book.price})">🛒 Buy Now</button>
</li>`;
  });
  html += "</ul>";

  document.getElementById("books").innerHTML = html;
}

async function searchBooks() {
  const query = document.getElementById("search").value;
  const res = await fetch(`/api/books/search?q=${query}`);
  const books = await res.json();

  let html = "<ul>";
  books.forEach(book => {
    html += `<li><strong>${book.title}</strong> - ${book.author} 
    [<a href="${book.filePath}" target="_blank">Read</a>]</li>`;
  });
  html += "</ul>";

  document.getElementById("books").innerHTML = html;
}
// Buy Now Function
async function buyBook(bookTitle, bookPrice) {
    const customerName = prompt("Apna naam daalo:");
    const customerEmail = prompt("Apni Gmail ID daalo:");

    if (!customerName || !customerEmail) {
        alert("❌ Naam aur email dono zaroori hain!");
        return;
    }

    const orderData = {
        customerName: customerName,
        customerEmail: customerEmail,
        books: [{ title: bookTitle, price: bookPrice, qty: 1 }],
        totalAmount: bookPrice,
        paymentMethod: "Online",
        orderId: "VEB-" + Date.now()
    };

    try {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });
        const data = await res.json();
        if (res.ok) {
            alert("✅ Order ho gaya! Email check karo: " + customerEmail);
        } else {
            alert("❌ Kuch galat hua: " + data.message);
        }
    } catch (err) {
        alert("❌ Server se connect nahi ho paya!");
    }
}