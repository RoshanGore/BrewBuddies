import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coffee, Utensils, Gift, Tag, Sparkles, ArrowRight, Star, Heart } from "lucide-react";
import TableBanner from "../../components/customer/TableBanner";
import LoyaltyCard from "../../components/customer/LoyaltyCard";
import MenuItemCard from "../../components/customer/MenuItemCard";
import api from "../../services/api";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, offerRes] = await Promise.all([
          api.getProducts(),
          api.getOffers(),
        ]);
        if (prodRes.success) {
          // Take top 4 items
          setFeaturedProducts(prodRes.products.slice(0, 4));
        }
        if (offerRes.success) {
          setOffers(offerRes.offers.slice(0, 2));
        }
      } catch (err) {
        console.warn("[Home] Data load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Table Recognition Banner */}
      <TableBanner />

      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 to-amber-950 text-white p-6 shadow-md">
        <div className="relative z-10 max-w-xs">
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-amber-400/30">
            <Sparkles className="w-3 h-3" /> Freshly Brewed
          </span>
          <h2 className="text-2xl font-bold font-serif leading-tight">
            Order from your table, sip back & relax.
          </h2>
          <p className="text-xs text-stone-300 mt-2 leading-relaxed">
            Zero queues. Handcrafted espresso and fresh bakery delivered directly to your table.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Link
              to="/menu"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Browse Menu</span>
            </Link>
            <Link
              to="/rewards"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-sm transition-colors"
            >
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              <span>Rewards</span>
            </Link>
          </div>
        </div>

        {/* Decorative circle */}
        <div className="absolute -right-6 -bottom-10 w-44 h-44 rounded-full bg-amber-600/20 blur-2xl pointer-events-none"></div>
      </div>

      {/* Loyalty Points Preview */}
      <LoyaltyCard />

      {/* Active Promos Highlights */}
      {offers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Tag className="w-4 h-4 text-amber-700" />
              <span>Today's Dine-In Deals</span>
            </div>
            <Link to="/offers" className="text-xs text-amber-800 font-semibold hover:underline flex items-center gap-0.5">
              <span>All Offers</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {offers.map((offer) => (
              <div
                key={offer._id}
                className="bg-white rounded-xl p-3 border border-amber-200/60 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      {offer.code}
                    </span>
                    <span className="text-xs font-semibold text-stone-900">{offer.title}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">{offer.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured / Popular Menu Items */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-base font-bold font-serif text-stone-900">Featured Favorites</h3>
            <p className="text-xs text-stone-500">Curated house picks for today</p>
          </div>
          <Link
            to="/menu"
            className="text-xs font-semibold text-amber-900 hover:text-amber-700 flex items-center gap-0.5"
          >
            <span>View Full Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-56 bg-stone-200/60 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {featuredProducts.map((product) => (
              <MenuItemCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
