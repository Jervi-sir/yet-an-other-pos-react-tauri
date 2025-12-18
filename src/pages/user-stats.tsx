import { useState, useMemo, useEffect } from "react";
import db from "@/db/database";
import { users as usersTable, sales, cashSessions, saleLines, products as productsTable } from "@/db/schema";
// import { useStore } from "@/context/StoreContext";
import type { User, Sale, CashSession, SaleLine, Product } from "@/types";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

export default function UserStatsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [u, s, sess, sl, p] = await Promise.all([
          db.select().from(usersTable),
          db.select().from(sales),
          db.select().from(cashSessions),
          db.select().from(saleLines),
          db.select().from(productsTable)
        ]);

        setUsers(u.map(us => ({ ...us, email: us.email || undefined, role: us.role as any })));
        setSales(s as unknown as Sale[]);
        setSessions(sess.map(se => ({
          ...se,
          email: se.email || undefined,
          end_time: se.end_time || undefined,
          expected_cash_balance: se.expected_cash_balance || undefined,
          actual_cash_balance: se.actual_cash_balance || undefined,
          difference: se.difference || undefined,
          role: se.role as any,
          status: se.status as any
        })));
        setSaleLines(sl as unknown as SaleLine[]);
        setProducts(p as unknown as Product[]);
      } catch (error) {
        console.error(error);
      }
    };
    loadData();
  }, []);

  // Filter States
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Compute Session Data
  const sessionData = useMemo(() => {
    let filteredSessions = [...sessions];

    // Filter by Cashier
    if (selectedUserId !== "all") {
      filteredSessions = filteredSessions.filter(s => s.user_id === Number(selectedUserId));
    }

    // Filter by Date
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      filteredSessions = filteredSessions.filter(s => s.start_time.startsWith(dateStr));
    }

    // Sort by Date Descending
    filteredSessions.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return filteredSessions.map(session => {
      // Find sales associated with this session
      // Primary: Linked via cash_session_id
      // Fallback: Time range match (legacy/safety)
      let sessionSales = sales.filter(s => s.cash_session_id === session.id);

      if (sessionSales.length === 0) {
        const start = new Date(session.start_time).getTime();
        const end = session.end_time ? new Date(session.end_time).getTime() : Date.now(); // If open, until now
        sessionSales = sales.filter(s => {
          const saleTime = new Date(s.created_at).getTime();
          return s.created_by_user_id === session.user_id && saleTime >= start && saleTime <= end;
        });
      }

      // 1. Total Products Sold
      const productsSold = sessionSales.reduce((count, sale) => {
        const lines = saleLines.filter(l => l.sale_id === sale.id);
        return count + lines.reduce((c, l) => c + l.qty, 0);
      }, 0);

      // 2. Total Sales (Revenue)
      const totalRevenue = sessionSales.reduce((sum, s) => sum + s.grand_total, 0);

      // 3. Total Gain (Profit)
      const totalGain = sessionSales.reduce((gain, sale) => {
        const lines = saleLines.filter(l => l.sale_id === sale.id);
        const saleGain = lines.reduce((g, line) => {
          const product = products.find(p => p.id === line.product_id);
          const cost = product ? product.cost_price : 0;
          return g + ((line.unit_price - cost) * line.qty);
        }, 0);
        return gain + saleGain;
      }, 0);

      // 4. POS Sold Count (Number of Transactions)
      const posSoldCount = sessionSales.length;

      return {
        id: session.id,
        user_name: users.find(u => u.id === session.user_id)?.name || "Unknown",
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status,
        productsSold,
        totalRevenue,
        totalGain,
        posSoldCount
      };
    });
  }, [sessions, selectedUserId, date, sales, saleLines, products, users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Cashier Sessions</h1>
        <p className="text-muted-foreground">
          Monitor cashier performance per session: login times, sales volume, and profitability.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-muted/20 p-4 rounded-lg border">

        {/* User Filter */}
        <div className="w-full sm:w-[250px]">
          <label className="text-sm font-medium mb-1.5 block">User</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Users" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  {u.name} <span className="text-muted-foreground">(@{u.username})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Filter */}
        <div className="w-full sm:w-auto flex-1">
          <label className="text-sm font-medium mb-1.5 block">Date</label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {date && (
              <Button variant="ghost" onClick={() => setDate(undefined)}>
                Clear Date
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Session List</CardTitle>
          <CardDescription>
            {sessionData.length} sessions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead className="text-right">Trans. Count</TableHead>
                  <TableHead className="text-right">Prod. Sold</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Total Gain</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionData.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {new Date(session.start_time).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-sm">
                        {session.user_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      {session.end_time
                        ? new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-muted-foreground italic">Active</span>}
                    </TableCell>
                    <TableCell className="text-right">{session.posSoldCount}</TableCell>
                    <TableCell className="text-right">{session.productsSold}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {Math.round(session.totalRevenue)} da
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {Math.round(session.totalGain)} da
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                        {session.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {sessionData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No sessions found matching filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
