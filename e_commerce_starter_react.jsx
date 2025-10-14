import React, { useMemo, useState } from "react";
import { ShoppingCart, Search, Filter, Minus, Plus, X, Trash2, Star, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// --- Mock catalog ---
const CATALOG = [
  { id: "p1", name: "Classic Tee", price: 29.99, category: "Apparel", rating: 4.5, image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop" },
  { id: "p2", name: "Denim Jacket", price: 89.0, category: "Apparel", rating: 4.7, image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop" },
  { id: "p3", name: "Leather Boots", price: 129.0, category: "Footwear", rating: 4.6, image: "https://images.unsplash.com/photo-1517940310602-585805b53f6f?q=80&w=1200&auto=format&fit=crop" },
  { id: "p4", name: "Running Sneakers", price: 99.0, category: "Footwear", rating: 4.3, image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=1200&auto=format&fit=crop" },
  { id: "p5", name: "Everyday Backpack", price: 79.0, category: "Accessories", rating: 4.4, image: "https://images.unsplash.com/photo-1514477917009-389c76a86b68?q=80&w=1200&auto=format&fit=crop" },
  { id: "p6", name: "Wool Beanie", price: 19.0, category: "Accessories", rating: 4.1, image: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop" },
];

const CATEGORIES = ["All", ...Array.from(new Set(CATALOG.map(p => p.category)))];

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
}

export default function EcommerceStarter() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return CATALOG.filter(p =>
      (category === "All" || p.category === category) &&
      (q === "" || p.name.toLowerCase().includes(q)) &&
      (minPrice === "" || p.price >= parseFloat(minPrice)) &&
      (maxPrice === "" || p.price <= parseFloat(maxPrice))
    );
  }, [query, category, minPrice, maxPrice]);

  const cartItems = useMemo(() => {
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ ...CATALOG.find(p => p.id === id)!, qty }));
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const gst = subtotal * 0.1; // AU GST 10%
    const total = subtotal + gst;
    return { items, subtotal, gst, total };
  }, [cart]);

  function addToCart(id: string) {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setCartOpen(true);
  }
  function removeFromCart(id: string) {
    setCart(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function changeQty(id: string, delta: number) {
    setCart(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white">ES</span>
            <span>E‑Shop</span>
          </div>

          <div className="ml-auto hidden md:flex items-center gap-2 w-[40ch]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" className="pl-9" />
            </div>
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" className="gap-2"><ShoppingCart className="h-4 w-4"/>Cart ({Object.values(cart).reduce((a,b)=>a+b,0)})</Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Your cart</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  {cartItems.items.length === 0 ? (
                    <p className="text-sm text-neutral-500">Your cart is empty.</p>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.items.map(item => (
                        <div key={item.id} className="flex gap-3">
                          <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover"/>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-neutral-500">{formatAUD(item.price)}</p>
                              </div>
                              <button className="p-1" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4"/></button>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button size="icon" variant="outline" onClick={() => changeQty(item.id, -1)}><Minus className="h-4 w-4"/></Button>
                              <span className="min-w-6 text-center">{item.qty}</span>
                              <Button size="icon" onClick={() => changeQty(item.id, +1)}><Plus className="h-4 w-4"/></Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="pt-2 border-t space-y-1 text-sm">
                        <div className="flex justify-between"><span>Subtotal</span><span>{formatAUD(cartItems.subtotal)}</span></div>
                        <div className="flex justify-between"><span>GST (10%)</span><span>{formatAUD(cartItems.gst)}</span></div>
                        <div className="flex justify-between font-semibold text-base mt-1"><span>Total</span><span>{formatAUD(cartItems.total)}</span></div>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full gap-2 mt-2"><CreditCard className="h-4 w-4"/>Checkout</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Mock Checkout</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm text-neutral-600">This is a demo. Hook this button up to Stripe, PayPal, or your preferred provider.
                          </p>
                          <Button className="mt-4">Pay {formatAUD(cartItems.total)}</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-3 items-stretch">
          <div className="md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" className="pl-9" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4"/>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <Button key={c} variant={c===category?"default":"secondary"} onClick={() => setCategory(c)} className="rounded-2xl">{c}</Button>
              ))}
            </div>
          </div>

          <div className="md:ml-auto grid grid-cols-2 sm:flex items-center gap-2">
            <Input type="number" inputMode="decimal" placeholder="Min $" value={minPrice} onChange={e=>setMinPrice(e.target.value)} />
            <Input type="number" inputMode="decimal" placeholder="Max $" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => (
            <Card key={p.id} className="overflow-hidden rounded-2xl shadow-sm">
              <div className="relative">
                <img src={p.image} alt={p.name} className="h-52 w-full object-cover"/>
                <Badge className="absolute left-3 top-3 bg-white/90 text-black border">{p.category}</Badge>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({length:5}).map((_,i)=> (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(p.rating) ? '' : 'opacity-30'}`}/>
                  ))}
                  <span className="text-xs text-neutral-500 ml-1">{p.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">{formatAUD(p.price)}</span>
                  <Button onClick={()=>addToCart(p.id)} className="rounded-2xl">Add to cart</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="font-semibold mb-2">E‑Shop</p>
            <p className="text-sm text-neutral-500">A minimal e‑commerce starter. Replace the mock data with your catalog and connect payments.</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Support</p>
            <ul className="text-sm text-neutral-500 space-y-1">
              <li>Shipping & Returns</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Get updates</p>
            <div className="flex gap-2">
              <Input placeholder="Email address" />
              <Button>Subscribe</Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
