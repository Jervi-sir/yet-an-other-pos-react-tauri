import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/main-layout';
import ProductSalesPage from '@/pages/product-sales';
import UserStatsPage from '@/pages/user-stats';
import { useAuth } from '@/lib/auth';
import LoginPage from './pages/login';
import Dashboard from './pages/dashboard';
import ProductsPage from './pages/products';
import CategoriesPage from './pages/categories';
import UnitsPage from './pages/units';
import CustomersPage from './pages/customers';
import SalesPage from './pages/sales';
import UsersPage from './pages/users';
import PosPage from './pages/pos';

const ProtectedRoute = () => {
	const currentUser = useAuth();
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
					<Route path="/customers" element={<CustomersPage />} />
					<Route path="/sales" element={<SalesPage />} />
					<Route path="/product-sales" element={<ProductSalesPage />} />
					<Route path="/user-stats" element={<UserStatsPage />} />
					<Route path="/users" element={<UsersPage />} />
				</Route>
				<Route path="/pos" element={
					<div className="min-h-screen bg-background p-4">
						<div className="mb-4 flex items-center justify-between">
							<h1 className="text-xl font-bold">POS Terminal</h1>
							<Link to="/" className="text-sm underline">Back to Dashboard</Link>
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
			<AppRoutes />
		</Router>
	);
}

export default App;
