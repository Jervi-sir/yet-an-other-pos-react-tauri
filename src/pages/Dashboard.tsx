import { useEffect, useState } from "react";
import db from "@/db/database";
import { sales, saleLines, products, customers, productCategories } from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Package, ShoppingCart, Users, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";

interface DashboardStats {
  summary: {
    totalRevenue: number;
    totalSales: number;
    totalProducts: number;
    totalCustomers: number;
  };
  salesOverTime: { date: string; revenue: number }[];
  salesByHour: { hour: string; value: number }[];
  topProducts: { name: string; value: number }[];
  salesByCategory: { name: string; value: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const fetchStats = async () => {
    try {
      const start = dateRange?.from?.toISOString();
      const end = dateRange?.to?.toISOString();

      // Base filter for sales
      const conditions = [eq(sales.status, 'completed')];
      if (start) conditions.push(sql`${sales.created_at} >= ${start}`);
      if (end) conditions.push(sql`${sales.created_at} <= ${end}`);

      const salesWhere = and(...conditions);

      // 1. Summary Cards (Revenue and Sales Count depend on filter)
      const totalRevenueResult = await db.select({ value: sql<number>`sum(${sales.grand_total})` })
        .from(sales).where(salesWhere);
      const totalRevenue = totalRevenueResult[0]?.value || 0;

      const totalSalesResult = await db.select({ value: sql<number>`count(*)` })
        .from(sales).where(salesWhere);
      const totalSales = totalSalesResult[0]?.value || 0;

      // Static counts (Total database size)
      const totalProductsResult = await db.select({ value: sql<number>`count(*)` }).from(products);
      const totalProducts = totalProductsResult[0]?.value || 0;

      const totalCustomersResult = await db.select({ value: sql<number>`count(*)` }).from(customers);
      const totalCustomers = totalCustomersResult[0]?.value || 0;

      // 2. Sales Over Time
      const salesOverTime = await db.select({
        date: sql<string>`substr(${sales.created_at}, 1, 10)`,
        revenue: sql<number>`sum(${sales.grand_total})`
      })
        .from(sales)
        .where(salesWhere)
        .groupBy(sql`substr(${sales.created_at}, 1, 10)`)
        .orderBy(sql`substr(${sales.created_at}, 1, 10)`);

      // 3. Sales By Hour (Distribution 00-23)
      // This answers "stats of sales on each hour of the day"
      const salesByHour = await db.select({
        hour: sql<string>`strftime('%H', ${sales.created_at})`,
        value: sql<number>`sum(${sales.grand_total})`
      })
        .from(sales)
        .where(salesWhere)
        .groupBy(sql`strftime('%H', ${sales.created_at})`)
        .orderBy(sql`strftime('%H', ${sales.created_at})`);

      // 4. Top Products
      const topProducts = await db.select({
        name: saleLines.product_name,
        value: sql<number>`sum(${saleLines.line_total})`
      })
        .from(saleLines)
        .leftJoin(sales, eq(saleLines.sale_id, sales.id))
        .where(salesWhere)
        .groupBy(saleLines.product_name)
        .orderBy(desc(sql`sum(${saleLines.line_total})`))
        .limit(5);

      // 5. Sales by Category
      const salesByCategory = await db.select({
        name: productCategories.name,
        value: sql<number>`sum(${saleLines.line_total})`
      })
        .from(saleLines)
        .leftJoin(products, eq(saleLines.product_id, products.id))
        .leftJoin(productCategories, eq(products.category_id, productCategories.id))
        .leftJoin(sales, eq(saleLines.sale_id, sales.id))
        .where(and(
          sql`${productCategories.name} IS NOT NULL`,
          salesWhere
        ))
        .groupBy(productCategories.name);

      setStats({
        summary: {
          totalRevenue,
          totalSales,
          totalProducts,
          totalCustomers
        },
        salesOverTime,
        salesByHour,
        topProducts,
        salesByCategory: salesByCategory.map(item => ({
          ...item,
          name: item.name || 'Unknown'
        }))
      });

    } catch (e) {
      console.error('Error in stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const presetToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const presetWeek = () => setDateRange({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) });
  const presetMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

  if (!stats) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={presetToday}>Today</Button>
          <Button variant="outline" size="sm" onClick={presetWeek}>This Week</Button>
          <Button variant="outline" size="sm" onClick={presetMonth}>This Month</Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                size="sm"
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalRevenue.toLocaleString()} da</div>
            <p className="text-xs text-muted-foreground">in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalSales}</div>
            <p className="text-xs text-muted-foreground">in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Total Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Total Registered</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Sales Over Time Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Revenue over time within selection</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.salesOverTime}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Sales Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Hourly Sales Distribution</CardTitle>
            <CardDescription>
              Sales aggregated by hour of the day (00-23)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.salesByHour}>
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Top Products Bar Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top 5 Products</CardTitle>
            <CardDescription>By revenue in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category Pie Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>
              Distribution of sales across product categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.salesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
