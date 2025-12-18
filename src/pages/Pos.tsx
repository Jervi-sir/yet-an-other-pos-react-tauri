import { useState, useRef, useEffect, useCallback } from "react";
// import { useStore } from "@/context/StoreContext"; // Removed
import { useAuth, getSession, setSession, removeSession, removeUser } from "@/lib/auth";
import type { Product, SaleLine, Customer, Sale, CashSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, Trash2, User as UserIcon, ScanBarcode, Search, LogOut, History, FileText, Calculator } from "lucide-react";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CartItem extends Omit<SaleLine, 'id' | 'sale_id'> {
  product_id: number | null; // number for real products, null for custom
  ui_id: string; // Temporary UI ID
}

export default function PosPage() {
  const currentUser = useAuth();
  const [currentSession, setCurrentSessionState] = useState<CashSession | null>(getSession());
  // Helper to sync local state with storage
  const updateSession = (s: any) => {
    setSession(s);
    setCurrentSessionState(s);
  };

  const startSession = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          start_time: new Date().toISOString(),
          opening_balance: 0,
          status: 'open',
        })
      });
      if (res.ok) {
        updateSession(await res.json());
      }
    } catch (e) { console.error("Start session failed", e); }
  };

  const closeSession = async (sessionId: number) => {
    try {
      await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          end_time: new Date().toISOString(),
          status: 'closed',
        })
      });
      removeSession();
      setCurrentSessionState(null);
    } catch (e) { console.error("Close session failed", e); }
  };

  const logout = () => {
    removeUser();
    window.location.href = '/login';
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  // Custom Item State
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemName, setCustomItemName] = useState("Custom Item");

  const [customerSearch, setCustomerSearch] = useState("");

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    // Fetch Products & Customers on mount
    const fetchData = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`${API_URL}/products`),
          fetch(`${API_URL}/customers`)
        ]);
        if (pRes.ok) setProducts(await pRes.json());
        if (cRes.ok) setCustomers(await cRes.json());
      } catch (e) {
        console.error("Failed to load POS data", e);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isHistoryOpen) {
      fetch(`${API_URL}/sales`).then(r => r.json()).then(setSales).catch(console.error);
    }
  }, [isHistoryOpen]);

  // Initial Session Check
  useEffect(() => {
    if (currentUser && !currentSession) {
      startSession();
    }
  }, [currentUser, currentSession, startSession]);

  const addSale = async (sale: any, lines: any[], payments: any[]) => {
    try {
      const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale, lines, payments })
      });
      if (res.ok) {
        // Refresh sales if history is open, or just let it refresh next time it opens
        if (isHistoryOpen) {
          fetch(`${API_URL}/sales`).then(r => r.json()).then(setSales).catch(console.error);
        }
      }
    } catch (e) {
      console.error("Failed to submit sale", e);
    }
  };

  // --- Hotkeys & Focus Management ---

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F2') {
      e.preventDefault();
      inputRef.current?.focus();
    }
    if (e.key === 'F9') {
      e.preventDefault();
      if (cart.length > 0) setIsPayOpen(true);
    }
    if (e.key === 'F8') {
      e.preventDefault();
      setIsCustomItemOpen(true);
    }
  }, [cart]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Auto-focus input
  useEffect(() => {
    // Only focus if no dialogs are open
    if (!isPayOpen && !isCustomerOpen && !isHistoryOpen && !isCustomItemOpen) {
      inputRef.current?.focus();
    }
  }, [isPayOpen, isCustomerOpen, isHistoryOpen, isCustomItemOpen, cart]);


  // --- Cart Actions ---

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, qty: item.qty + 1, line_total: (item.qty + 1) * item.unit_price }
            : item
        );
      }
      return [
        ...prev,
        {
          ui_id: Math.random().toString(36).substr(2, 9),
          product_id: product.id,
          product_name: product.name,
          qty: 1,
          unit_price: product.sale_price,
          discount: 0,
          tax_rate: 0, // No tax
          line_total: product.sale_price,
        },
      ];
    });
  };

  const addCustomItem = () => {
    const price = parseFloat(customItemPrice);
    if (!price || price <= 0) return;

    setCart((prev) => [
      ...prev,
      {
        ui_id: Math.random().toString(36).substr(2, 9),
        product_id: null,
        product_name: customItemName || "Custom Item",
        qty: 1,
        unit_price: price,
        discount: 0,
        tax_rate: 0,
        line_total: price,
      }
    ]);

    // Reset
    setCustomItemPrice("");
    setCustomItemName("Custom Item");
    setIsCustomItemOpen(false);
  };

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const term = inputValue.trim().toLowerCase();
      if (!term) return;

      const product = products.find(p =>
        p.barcode === term ||
        p.name.toLowerCase() === term
      );

      if (product) {
        addToCart(product);
        setInputValue("");
      } else {
        // Error sound/feedback?
      }
    }
  };

  const updateQty = (uiId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.ui_id === uiId) {
          const newQty = Math.max(0, item.qty + delta);
          return { ...item, qty: newQty, line_total: newQty * item.unit_price };
        }
        return item;
      }).filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (uiId: string) => {
    setCart((prev) => prev.filter((item) => item.ui_id !== uiId));
  };

  const clearCart = () => setCart([]);

  // --- Totals ---

  const subtotal = cart.reduce((acc, item) => acc + item.line_total, 0);
  const taxTotal = 0; // Removed tax
  const grandTotal = subtotal + taxTotal;

  // --- Checkout ---

  const handleCheckout = (method: string, paidAmount: number) => {
    if (!currentUser) return;

    // We don't generate IDs here anymore. Backend handles it.
    const saleData = {
      document_number: `WS-${Date.now()}`,
      type: 'pos_receipt' as const,
      customer_id: selectedCustomerId || undefined,
      status: 'completed' as const,
      subtotal,
      discount_total: 0,
      tax_total: taxTotal,
      grand_total: grandTotal,
      paid_total: paidAmount,
      change_due: paidAmount - grandTotal,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      created_by_user_id: currentUser.id,
      cash_session_id: currentSession?.id,
    };

    // Lines without sale_id (backend adds it)
    // We strip ui_id before sending
    const linesData = cart.map(({ ui_id, ...rest }) => ({
      ...rest,
    }));

    const paymentData = {
      method,
      amount: grandTotal,
      paid_at: new Date().toISOString(),
      reference: method === 'cash' ? undefined : 'External'
    };

    addSale(saleData, linesData, [paymentData]);

    // Success Loop
    setCart([]);
    setSelectedCustomerId(null);
    setIsPayOpen(false);

    // Simulate Receipt Print (optional toast or persistent log)
    console.log("Printing receipt for sale:", saleData.document_number);

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleLogout = async () => {
    if (currentSession) {
      await closeSession(currentSession.id);
    }
    logout();
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  // Sorted History Data
  const recentSales = [...sales].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4">

      {/* Header Bar */}
      <div className="flex justify-between items-center bg-card p-2 rounded-md border text-sm shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-medium">
            <UserIcon className="h-4 w-4" />
            <span>{currentUser?.name || 'Unknown User'}</span>
          </div>
          <div className="h-4 w-[1px] bg-border mx-2"></div>
          <div className="text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Terminal Active
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCustomItemOpen(true)}>
            <Calculator className="mr-2 h-4 w-4" /> Custom Item (F8)
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsHistoryOpen(true)}>
                <History className="mr-2 h-4 w-4" /> Transaction History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Top Bar: Scan Input & Customer */}
      <Card className="p-4 border-l-4 border-l-primary">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <ScanBarcode className="absolute left-3 top-3.5 h-6 w-6 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Scan Barcode / Enter Name... (F2 to focus)"
              className="pl-12 h-14 text-xl shadow-inner bg-background"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleScan}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto min-w-[200px]">
            {selectedCustomer ? (
              <div className="flex items-center justify-between gap-2 border rounded-md px-4 py-2 bg-muted/20 w-full h-14">
                <div className="flex items-center gap-2 overflow-hidden">
                  <UserIcon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-sm truncate">{selectedCustomer.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{selectedCustomer.email || 'No email'}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:text-destructive" onClick={() => setSelectedCustomerId(null)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="lg" onClick={() => setIsCustomerOpen(true)} className="w-full h-14 text-base font-medium">
                <UserIcon className="h-5 w-5 mr-2" />
                Select Customer
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Scanned Items Table */}
        <Card className="col-span-1 lg:col-span-9 flex flex-col h-full overflow-hidden shadow-sm">
          <div className="p-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead className="text-right w-[120px]">Price</TableHead>
                  <TableHead className="text-center w-[140px]">Quantity</TableHead>
                  <TableHead className="text-right w-[120px]">Line Total</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, index) => (
                  <TableRow key={item.ui_id} className="text-base hover:bg-muted/10">
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground">{item.product_name}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Math.round(item.unit_price)} da</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1 bg-muted/20 rounded-md p-1 w-fit mx-auto">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.ui_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-bold tabular-nums">{item.qty}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.ui_id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-lg">
                      {Math.round(item.line_total)} da
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeFromCart(item.ui_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {cart.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <ScanBarcode className="h-12 w-12 opacity-20" />
                        <span className="text-lg">Ready to Scan</span>
                        <span className="text-sm">Shortcuts: F2 (Scan) • F8 (Custom) • F9 (Pay)</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Right: Summary & Actions */}
        <Card className="col-span-1 lg:col-span-3 flex flex-col h-full bg-muted/5 shadow-md border-l">
          <CardHeader className="bg-background border-b pb-4">
            <CardTitle className="text-xl">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-6 pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-mono font-medium">{Math.round(subtotal)} da</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed">
                <span className="text-muted-foreground font-medium">Items</span>
                <span className="font-mono font-medium">{cart.reduce((a, c) => a + c.qty, 0)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase font-bold text-primary/70 tracking-wider">Total Due</span>
                <span className="font-bold text-4xl text-primary">{Math.round(grandTotal)} da</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3 p-4 bg-background border-t">
            <Button
              size="lg"
              className="w-full text-xl h-16 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              onClick={() => setIsPayOpen(true)}
              disabled={cart.length === 0}
            >
              PAY (F9)
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-colors"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Cancel Sale
            </Button>
          </CardFooter>
        </Card>
      </div>

      <PaymentDialog
        open={isPayOpen}
        onOpenChange={setIsPayOpen}
        totalAmount={grandTotal}
        onConfirm={handleCheckout}
      />

      {/* Customer Dialog */}
      <Dialog open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone..."
              className="pl-9 mb-4"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ScrollArea className="h-[300px] -mx-4 px-4">
            <div className="grid gap-2">
              {filteredCustomers.map(c => (
                <Button
                  key={c.id}
                  variant={selectedCustomerId === c.id ? "secondary" : "outline"}
                  className={`justify-start h-auto py-3 px-4 ${selectedCustomerId === c.id ? 'border-primary' : 'border-transparent bg-muted/30'}`}
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setIsCustomerOpen(false);
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-base">{c.name}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{c.phone || 'No Phone'}</span>
                    </div>
                  </div>
                </Button>
              ))}
              {filteredCustomers.length === 0 && <div className="text-center text-muted-foreground py-8">No customers found</div>}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Recent Transactions</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map(sale => {
                    const customer = customers.find(c => c.id === sale.customer_id);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="py-3">
                          {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="text-xs text-muted-foreground block">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{sale.document_number}</TableCell>
                        <TableCell>{customer ? customer.name : 'Walk-in'}</TableCell>
                        <TableCell className="text-right font-medium">{Math.round(sale.grand_total)} da</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {recentSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No recent transactions found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Item Dialog */}
      <Dialog open={isCustomItemOpen} onOpenChange={setIsCustomItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="custom-name">Item Name</Label>
              <Input
                id="custom-name"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-price">Price (da)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">da</span>
                <Input
                  id="custom-price"
                  type="number"
                  className="pl-9"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomItem();
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomItemOpen(false)}>Cancel</Button>
            <Button onClick={addCustomItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
