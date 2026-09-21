import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Check, X, Sparkles, Coffee, Clock } from "lucide-react";
import OwnerHeader from "../../components/owner/OwnerHeader";
import api from "../../services/api";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    image: "",
    isVegetarian: true,
    preparationTimeMinutes: 5,
    tags: "",
  });

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      if (prodRes.success) setProducts(prodRes.products);
      if (catRes.success) setCategories(catRes.categories);
    } catch (err) {
      console.warn("[Products] Load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStock = async (id) => {
    try {
      await api.toggleProductStock(id);
      fetchData();
    } catch (err) {
      alert("Error updating stock: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this menu product?")) {
      try {
        await api.deleteProduct(id);
        fetchData();
      } catch (err) {
        alert("Error deleting product: " + err.message);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: categories[0]?._id || "",
      price: "",
      description: "",
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
      isVegetarian: true,
      preparationTimeMinutes: 5,
      tags: "Popular",
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category?._id || categories[0]?._id || "",
      price: product.price.toString(),
      description: product.description || "",
      image: product.image || "",
      isVegetarian: product.isVegetarian,
      preparationTimeMinutes: product.preparationTimeMinutes || 5,
      tags: product.tags?.join(", ") || "",
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        price: Number(formData.price),
        description: formData.description,
        image: formData.image,
        isVegetarian: formData.isVegetarian,
        preparationTimeMinutes: Number(formData.preparationTimeMinutes),
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct._id, payload);
      } else {
        await api.createProduct(payload);
      }

      setShowAddModal(false);
      fetchData();
    } catch (err) {
      alert("Error saving product: " + err.message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <OwnerHeader
        title="Products & Menu Management"
        subtitle="Manage coffee items, food specials, pricing, and live availability"
        actions={
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        }
      />

      {/* Product List Table / Grid */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {products.length} Menu Items Total
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading menu products...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-xs">
            <Coffee className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            No products found. Click "Add New Item" to create one.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {products.map((product) => (
              <div
                key={product._id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={product.image || "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80"}
                    alt={product.name}
                    className="w-14 h-14 rounded-2xl object-cover bg-stone-100 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-stone-900">{product.name}</h4>
                      {product.isVegetarian && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Veg
                        </span>
                      )}
                      <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                        {product.category?.name || "Uncategorized"}
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                      {product.description || "No description provided."}
                    </p>

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-400">
                      <span>₹{product.price.toFixed(2)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {product.preparationTimeMinutes} min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock toggle and edit buttons */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleStock(product._id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      product.isAvailable
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                    }`}
                  >
                    {product.isAvailable ? "In Stock" : "Out of Stock"}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(product)}
                    className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                    title="Edit Product"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(product._id)}
                    className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold font-serif text-stone-900 mb-4">
              {editingProduct ? "Edit Product" : "Add New Menu Item"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Vanilla Bean Latte"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="240"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short, delicious description for customers..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.preparationTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, preparationTimeMinutes: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vegCheck"
                    checked={formData.isVegetarian}
                    onChange={(e) => setFormData({ ...formData, isVegetarian: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-900 focus:ring-amber-500"
                  />
                  <label htmlFor="vegCheck" className="font-semibold text-stone-800">
                    Vegetarian Item
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Bestseller, Organic, Chef Special"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
