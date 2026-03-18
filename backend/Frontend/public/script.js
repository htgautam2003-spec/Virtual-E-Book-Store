async function loadBooks() {
  const res = await fetch("/api/books");
  const books = await res.json();

  let html = "<ul>";
  books.forEach(book => {
    html += `<li><strong>${book.title}</strong> - ${book.author} 
    [<a href="${book.filePath}" target="_blank">Read</a>]</li>`;
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