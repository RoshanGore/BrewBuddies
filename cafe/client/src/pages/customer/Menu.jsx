import React, { useEffect, useState } from "react";
import { Search, Utensils, Filter, Check } from "lucide-react";
import MenuItemCard from "../../components/customer/MenuItemCard";
import TableBanner from "../../components/customer/TableBanner";
import { useTable } from "../../context/TableContext";
import api from "../../services/api";

const Menu = () => {
  const { cafe } = useTable();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const prodParams = {};
        if (cafe?.id || cafe?._id) {
          prodParams.cafeId = cafe.id || cafe._id;
        }
        const [catRes, prodRes] = await Promise.all([
          api.getCategories(),
          api.getProducts(prodParams),
        ]);
        if (catRes.success) setCategories(catRes.categories);
        if (prodRes.success) setProducts(prodRes.products);
      } catch (err) {
        console.error("[Menu] Fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [cafe?.id, cafe?._id]);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" || p.category?._id === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVeg = !onlyVeg || p.isVegetarian;

    return matchesCategory && matchesSearch && matchesVeg;
  });

  return (
    <div className="space-y-4">
      {/* Table Banner */}
      <TableBanner />

      {/* Header & Search */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Cafe Menu</h1>
        <p className="text-xs text-stone-500">Handcrafted drinks and fresh bites</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search coffee, croissants, sandwiches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-stone-200/80 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-xs"
        />
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedCategory === "all"
              ? "bg-amber-900 text-white shadow-sm"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          All Items
        </button>

        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => setSelectedCategory(cat._id)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === cat._id
                ? "bg-amber-900 text-white shadow-sm"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Dietary Toggle */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setOnlyVeg(!onlyVeg)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            onlyVeg
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${onlyVeg ? "bg-emerald-600" : "bg-stone-400"}`}></span>
          <span>Vegetarian Only</span>
        </button>

        <span className="text-xs text-stone-400 font-medium">
          {filteredProducts.length} items
        </span>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5 pt-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-56 bg-stone-200/70 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center my-6">
          <Utensils className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">No items found</p>
          <p className="text-xs text-stone-400 mt-1">Try resetting your search or category filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 pt-2">
          {filteredProducts.map((product) => (
            <MenuItemCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Menu;
