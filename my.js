async function processPayment(method) {
    if (method === "Credit/Debit Card") {
        const num = document.getElementById("cardNum").value.replace(/\s/g, "");
        const name = document.getElementById("cardName").value;
        if (num.length < 16 || !name) { showToast("❌ Fill card details!", "error"); return; }
    }
    if (method === "Net Banking") {
        if (!document.getElementById("bankSelect").value) {
            showToast("❌ Select a bank!", "error"); return;
        }
    }
    if (method === "UPI") {
        const upi = document.getElementById("upiId").value;
        if (!upi) { showToast("❌ Enter UPI ID!", "error"); return; }
    }
    if (method === "Cash on Delivery") {
        const email = document.getElementById("codEmail").value;
        if (!email || !email.includes("@")) {
            showToast("❌ Enter valid email!", "error"); return;
        }
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const orderId = "ORD" + Math.floor(Math.random() * 900000 + 100000);

    // ✅ Save order to MongoDB
    try {
        await fetch(`${API}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                books: cart.map(i => ({
                    title: i.name,
                    price: i.price,
                    qty: i.qty
                })),
                totalAmount: total,
                paymentMethod: method,
                orderId: orderId,
                status: "completed",

                // 🔥 ADDED PART (ONLY CHANGE)
                customerName: document.getElementById("customerName")?.value || "Customer",
                customerEmail: document.getElementById("customerEmail")?.value 
                    || document.getElementById("codEmail")?.value 
                    || ""
            })
        });
        showToast("✅ Order saved to database!", "success");
    } catch (error) {
        console.log("Could not save order:", error);
    }

    // Add to downloads
    cart.forEach(item => {
        const book = books.find(b => b.title === item.name);
        if (book && !downloads.find(d => d.title === book.title)) {
            downloads.push({ ...book, purchasedAt: new Date().toLocaleDateString() });
        }
    });
    saveDownloads();
    updateDlCount();
    renderDownloadSection();

    // Show success
    document.getElementById("successDetails").innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span>Order ID</span>
            <span style="color:#a78bfa;font-weight:700">${orderId}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span>Payment</span>
            <span style="color:#10b981;font-weight:700">${method}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span>Books</span>
            <span>${cart.length} item(s)</span>
        </div>
        <div style="display:flex;justify-content:space-between">
            <span>Total Paid</span>
            <span style="color:#a78bfa;font-weight:700">
                ${total === 0 ? "FREE" : "₹" + total}
            </span>
        </div>`;

    closeModal("payModal");
    openModal("successModal");
    cart = []; saveCart(); renderCart(); updateCartCount();
}