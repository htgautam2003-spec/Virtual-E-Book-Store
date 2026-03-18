const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: String,
  category: String,
  description: String,
  filePath: String,
  views: { type: Number, default: 0 }
});

module.exports = mongoose.model("Book", bookSchema);