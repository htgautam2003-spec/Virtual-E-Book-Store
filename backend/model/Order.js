const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    author:      { type: String, required: true, trim: true },
    price:       { type: Number, required: true, min: 0, default: 0 },
    tag:         { type: String, enum: ["free", "premium", "new"], default: "premium" },
    rating:      { type: String, default: "4.5" },
    reviews:     { type: String, default: "0" },
    img:         { type: String, default: "https://via.placeholder.com/230x200/241748/a78bfa?text=Book" },
    downloadUrl: { type: String, default: "#" },
    adminAdded:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);