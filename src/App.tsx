import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
// import { useStore } from '@/context/StoreContext'; // StoreProvider removed
import { MainLayout } from '@/components/layout/MainLayout';
import LoginPage from '@/pages/Login';
import ProductsPage from '@/pages/Products';
import PosPage from '@/pages/Pos';
import SalesPage from '@/pages/Sales';
import CustomersPage from '@/pages/Customers';
import UsersPage from '@/pages/Users';
import CategoriesPage from '@/pages/Categories';
import UnitsPage from '@/pages/Units';
import ProductSalesPage from '@/pages/ProductSales';
import UserStatsPage from '@/pages/UserStats';

// Dashboard Placeholder
import Dashboard from '@/pages/Dashboard';

import { useAuth } from '@/lib/auth';

// Protected Route Wrapper
const ProtectedRoute = () => {
	const currentUser = useAuth();
	// We can also check getUser() directly if we don't care about reactivity for the initial check 
	// but useAuth is safet for staying in sync.

	if (!currentUser) return <Navigate to="/login" replace />;
	return <Outlet />;
};

function AppRoutes() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />

			<Route element={<ProtectedRoute />}>
				<Route element={<MainLayout />}>
					<Route path="/" element={<Dashboard />} />
					<Route path="/products" element={<ProductsPage />} />
					<Route path="/categories" element={<CategoriesPage />} />
					<Route path="/units" element={<UnitsPage />} />
					<Route path="/customers" element={<CustomersPage />} /> {/* Added route for CustomersPage */}
					<Route path="/sales" element={<SalesPage />} />
					<Route path="/product-sales" element={<ProductSalesPage />} />
					<Route path="/user-stats" element={<UserStatsPage />} />
					<Route path="/users" element={<UsersPage />} /> {/* Added route for UsersPage */}
					{/* Add other pages here */}
				</Route>
				{/* POS often takes full screen or specific layout, but simplified here to share layout or own */}
				<Route path="/pos" element={
					<div className="min-h-screen bg-background p-4">
						<div className="mb-4 flex items-center justify-between">
							<h1 className="text-xl font-bold">POS Terminal</h1>
							<a href="/" className="text-sm underline">Back to Dashboard</a>
						</div>
						<PosPage />
					</div>
				} />
			</Route>

			<Route path="*" element={<Navigate to="/" />} />
		</Routes>
	);
}

function App() {
	return (
		<Router>
			{/* StoreProvider removed. Zustand store is global. */}
			<AppRoutes />
		</Router>
	);
}

export default App;
