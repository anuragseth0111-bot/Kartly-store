
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Search, ShoppingCart, MapPin, UserRound, Heart, Plus, Minus,
  ChevronRight, Clock3, ShieldCheck, Truck, Menu, X, Package,
  CircleHelp, ArrowRight, Leaf, Zap, RefreshCw
} from "lucide-react";
import "./style.css";

const SUPABASE_URL = "https://yofkpnvzqkkzreicnjlj.supabase.co";
const SUPABASE_KEY = "sb_publishable_MjLsZ0yH0pMm8_t-vd1TRA__d2IxmIr";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const categories = [
  { name: "All", icon: "🛍️" },
  { name: "Fruits & Vegetables", icon: "🥦" },
  { name: "Dairy & Breakfast", icon: "🥛" },
  { name: "Snacks & Munchies", icon: "🍿" },
  { name: "Beverages", icon: "🥤" },
  { name: "Personal Care", icon: "🧴" },
  { name: "Home Essentials", icon: "🧹" },
  { name: "Electronics", icon: "🔌" },
  { name: "Fashion", icon: "👕" },
  { name: "More", icon: "✨" }
];

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState({});
  const [wishlist, setWishlist] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: ""
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("products")
      .select("id,name,category,subcategory,description,unit,price,mrp,stock,image_url,is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (fetchError) {
      setError("Products load nahi hue. Supabase connection aur table permissions check karo.");
      setProducts([]);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((p) => {
      const matchesSearch =
        !term ||
        [p.name, p.category, p.subcategory, p.description]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));

      const matchesCategory =
        category === "All" ||
        category === "More" ||
        String(p.category || "").toLowerCase() === category.toLowerCase() ||
        String(p.subcategory || "").toLowerCase() === category.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const cartItems = useMemo(() => {
    return products
      .filter((p) => cart[p.id] > 0)
      .map((p) => ({ ...p, quantity: cart[p.id] }));
  }, [products, cart]);

  const itemCount = cartItems.reduce((sum, p) => sum + p.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, p) => sum + Number(p.price || 0) * p.quantity,
    0
  );
  const delivery = subtotal === 0 || subtotal >= 499 ? 0 : 20;
  const total = subtotal + delivery;

  function changeQuantity(product, delta) {
    setCart((current) => {
      const oldQty = current[product.id] || 0;
      const nextQty = Math.max(
        0,
        Math.min(Number(product.stock || 0), oldQty + delta)
      );
      const next = { ...current };

      if (nextQty === 0) delete next[product.id];
      else next[product.id] = nextQty;

      return next;
    });
  }

  function toggleWishlist(id) {
    setWishlist((old) =>
      old.includes(id) ? old.filter((item) => item !== id) : [...old, id]
    );
  }

  function formatPrice(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2
    });
  }

  async function placeOrder(event) {
    event.preventDefault();
    setMessage("");

    if (!customer.name.trim() || !/^[6-9]\d{9}$/.test(customer.phone)) {
      setMessage("Naam aur sahi 10-digit Indian mobile number bharo.");
      return;
    }

    if (!customer.address.trim()) {
      setMessage("Delivery address bharna zaroori hai.");
      return;
    }

    if (!cartItems.length) {
      setMessage("Tumhara cart khaali hai.");
      return;
    }

    setPlacingOrder(true);

    try {
      const { data, error: authError } = await supabase.functions.invoke(
        "place-order",
        {
          body: {
            customer_name: customer.name.trim(),
            customer_phone: customer.phone.trim(),
            delivery_address: customer.address.trim(),
            items: cartItems.map((p) => ({
              id: p.id,
              quantity: p.quantity
            }))
          }
        }
      );

      if (authError) throw authError;
      if (data?.error) throw new Error(data.error);

      setCart({});
      setCheckoutOpen(false);
      setCartOpen(false);
      setMessage(
        "Order request successful. Order details: " +
          JSON.stringify(data?.order_id ?? data?.order ?? data ?? "Submitted")
      );
      await loadProducts();
    } catch (e) {
      setMessage(
        "Order place nahi hua. Edge Function place-order aur Supabase logs check karo."
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  const categoryList = (
    <div className="category-list">
      {categories.map((c) => (
        <button
          key={c.name}
          className={`category-link ${category === c.name ? "selected" : ""}`}
          onClick={() => {
            setCategory(c.name);
            setMobileMenu(false);
          }}
        >
          <span className="category-emoji">{c.icon}</span>
          <span>{c.name}</span>
        </button>
      ))}
    </div>
  );

  function ProductCard({ product }) {
    const qty = cart[product.id] || 0;
    const stock = Number(product.stock || 0);
    const hasDiscount = Number(product.mrp) > Number(product.price);

    return (
      <article className="product-card">
        <button
          className={`wishlist-btn ${wishlist.includes(product.id) ? "liked" : ""}`}
          aria-label="Toggle wishlist"
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart size={17} fill={wishlist.includes(product.id) ? "currentColor" : "none"} />
        </button>

        <div className="product-image-wrap">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="product-image"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="product-placeholder">🛍️</div>
          )}
          {hasDiscount && (
            <span className="discount-badge">
              {Math.round((1 - Number(product.price) / Number(product.mrp)) * 100)}% OFF
            </span>
          )}
        </div>

        <div className="product-info">
          <span className="product-unit">{product.unit || "1 unit"}</span>
          <h3>{product.name}</h3>
          <div className="price-line">
            <strong>{formatPrice(product.price)}</strong>
            {hasDiscount && <del>{formatPrice(product.mrp)}</del>}
          </div>
          {stock <= 0 ? (
            <button className="add-btn disabled" disabled>Out of stock</button>
          ) : qty > 0 ? (
            <div className="quantity-control">
              <button onClick={() => changeQuantity(product, -1)} aria-label="Decrease">
                <Minus size={15} />
              </button>
              <strong>{qty}</strong>
              <button
                onClick={() => changeQuantity(product, 1)}
                disabled={qty >= stock}
                aria-label="Increase"
              >
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button className="add-btn" onClick={() => changeQuantity(product, 1)}>
              ADD <Plus size={14} />
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="app">
      <div className="announcement">
        <Zap size={15} fill="currentColor" />
        <span>Smart shopping. Better living.</span>
        <span className="announcement-dot">•</span>
        <span>Cash on delivery available</span>
      </div>

      <header className="topbar">
        <button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X /> : <Menu />}
        </button>

        <a className="brand" href="#" onClick={() => { setCategory("All"); setSearch(""); }}>
          <span className="brand-symbol">K</span>
          <span>KARTLY<small>SMART SHOPPING</small></span>
        </a>

        <button className="delivery-location" onClick={() => setMessage("Delivery availability depends on your service area.")}>
          <MapPin size={19} />
          <span><small>Deliver to</small><strong>Mirzapur, UP</strong></span>
          <ChevronRight size={15} />
        </button>

        <div className="search-box">
          <Search size={19} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for groceries, snacks and more..."
          />
          {search && <button onClick={() => setSearch("")}><X size={16} /></button>}
        </div>

        <button className="account-btn" onClick={() => setMessage("Customer login is not configured yet.")}>
          <UserRound size={19} /><span>Login</span>
        </button>

        <button className="cart-top-btn" onClick={() => setCartOpen(true)}>
          <ShoppingCart size={20} />
          <span>Cart</span>
          {itemCount > 0 && <b>{itemCount}</b>}
        </button>
      </header>

      <div className="mobile-search search-box">
        <Search size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
        />
      </div>

      <div className="page-layout">
        <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
          <div className="sidebar-heading">SHOP BY CATEGORY</div>
          {categoryList}
          <div className="sidebar-promo">
            <span>🛒</span>
            <strong>Everything you need.</strong>
            <small>All in one place.</small>
          </div>
        </aside>

        {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} />}

        <main className="main-content">
          <section className="hero">
            <div className="hero-copy">
              <span className="hero-kicker"><Zap size={14} /> YOUR EVERYDAY STORE</span>
              <h1>Daily essentials.<br /><em>Delivered smarter.</em></h1>
              <p>Groceries, snacks, home essentials and more—all in one place.</p>
              <button className="hero-button" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
                Shop now <ArrowRight size={17} />
              </button>
              <div className="hero-benefits">
                <span><ShieldCheck size={15} /> Secure shopping</span>
                <span><Truck size={15} /> COD available</span>
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-circle"></div>
              <div className="hero-bag">K</div>
              <span className="floating-item item-one">🥑</span>
              <span className="floating-item item-two">🥛</span>
              <span className="floating-item item-three">🍎</span>
              <span className="floating-item item-four">🥨</span>
            </div>
            <div className="hero-tag"><Zap size={16} /> FAST & EASY SHOPPING</div>
          </section>

          <section className="benefit-strip">
            <div><span className="benefit-icon yellow"><Truck /></span><span><strong>Easy delivery</strong><small>At your doorstep</small></span></div>
            <div><span className="benefit-icon green"><Leaf /></span><span><strong>Everyday essentials</strong><small>All in one place</small></span></div>
            <div><span className="benefit-icon blue"><ShieldCheck /></span><span><strong>Cash on delivery</strong><small>Pay when received</small></span></div>
            <div><span className="benefit-icon pink"><Heart /></span><span><strong>Made for you</strong><small>Shop your favourites</small></span></div>
          </section>

          <section className="category-section">
            <div className="section-heading">
              <div><span className="eyebrow">FIND YOUR FAVOURITES</span><h2>Shop by category</h2></div>
            </div>
            <div className="category-tiles">
              {categories.slice(1, 9).map((c, i) => (
                <button key={c.name} className={`category-tile tile-${i}`} onClick={() => setCategory(c.name)}>
                  <span>{c.icon}</span><strong>{c.name}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="products-section" id="products">
            <div className="section-heading product-heading">
              <div>
                <span className="eyebrow">{search ? "SEARCH RESULTS" : "THE KARTLY COLLECTION"}</span>
                <h2>{search ? `Results for “${search}”` : category === "All" ? "Popular essentials" : category}</h2>
                <p>Choose what you need, add it to your cart.</p>
              </div>
              <button className="outline-btn" onClick={loadProducts}><RefreshCw size={15} /> Refresh</button>
            </div>

            {loading ? (
              <div className="status-panel"><RefreshCw className="spin" /><strong>Loading your store...</strong><span>Connecting to Kartly catalogue</span></div>
            ) : error ? (
              <div className="status-panel error-panel"><Package size={30} /><strong>Store connection needs attention</strong><span>{error}</span><button className="add-btn" onClick={loadProducts}>Try again</button></div>
            ) : visibleProducts.length === 0 ? (
              <div className="status-panel"><Package size={34} /><strong>No products found</strong><span>{search ? "Try a different search." : "Add active products to your Supabase products table to show them here."}</span></div>
            ) : (
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>

          <section className="trust-section">
            <div><ShieldCheck /><span><strong>Shop with confidence</strong><small>Your shopping experience matters.</small></span></div>
            <div><Package /><span><strong>Essentials in one place</strong><small>Explore the growing catalogue.</small></span></div>
            <div><CircleHelp /><span><strong>Need help?</strong><small>Contact store support for assistance.</small></span></div>
          </section>
        </main>
      </div>

      <footer className="footer">
        <div className="footer-brand"><span className="brand-symbol">K</span><strong>KARTLY</strong></div>
        <p>Smart shopping. Better living.</p>
        <div className="footer-links"><span>Everyday essentials</span><span>•</span><span>Cash on delivery</span><span>•</span><span>Made for your convenience</span></div>
        <small>© {new Date().getFullYear()} Kartly. All rights reserved.</small>
      </footer>

      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div><ShoppingCart /><h2>Your Cart <span>({itemCount})</span></h2></div>
              <button className="icon-btn" onClick={() => setCartOpen(false)}><X /></button>
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-cart"><span>🛒</span><h3>Your cart is empty</h3><p>Discover your everyday essentials.</p><button className="add-btn" onClick={() => setCartOpen(false)}>Start shopping</button></div>
            ) : (
              <>
                <div className="cart-items">
                  {cartItems.map((p) => (
                    <div className="cart-item" key={p.id}>
                      <div className="cart-item-image">
                        {p.image_url ? <img src={p.image_url} alt={p.name} /> : <span>🛍️</span>}
                      </div>
                      <div className="cart-item-info"><strong>{p.name}</strong><small>{p.unit || "1 unit"}</small><b>{formatPrice(Number(p.price) * p.quantity)}</b></div>
                      <div className="quantity-control">
                        <button onClick={() => changeQuantity(p, -1)}><Minus size={14} /></button>
                        <strong>{p.quantity}</strong>
                        <button onClick={() => changeQuantity(p, 1)} disabled={p.quantity >= Number(p.stock || 0)}><Plus size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <h3>Bill details</h3>
                  <div><span>Item total</span><span>{formatPrice(subtotal)}</span></div>
                  <div><span>Delivery fee</span><span>{delivery === 0 ? "FREE" : formatPrice(delivery)}</span></div>
                  {subtotal > 0 && subtotal < 499 && <small>Add {formatPrice(499 - subtotal)} more for free delivery.</small>}
                  <div className="grand-total"><strong>To pay</strong><strong>{formatPrice(total)}</strong></div>
                  <button className="checkout-btn" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                    Continue to checkout <ArrowRight size={17} />
                  </button>
                  <p><ShieldCheck size={14} /> Cash on delivery</p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="drawer-backdrop" onClick={() => setCheckoutOpen(false)}>
          <aside className="checkout-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header"><h2>Delivery details</h2><button className="icon-btn" onClick={() => setCheckoutOpen(false)}><X /></button></div>
            <form onSubmit={placeOrder} className="checkout-form">
              <label>Full name<input required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Your name" /></label>
              <label>Mobile number<input required inputMode="numeric" maxLength={10} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit mobile number" /></label>
              <label>Full delivery address<textarea required rows={4} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="House, street, locality, city, PIN code" /></label>
              <div className="cod-note"><ShieldCheck /><span><strong>Cash on delivery</strong><small>Pay when your order is delivered.</small></span></div>
              <div className="grand-total"><strong>Total payable</strong><strong>{formatPrice(total)}</strong></div>
              {message && <p className="form-message">{message}</p>}
              <but
