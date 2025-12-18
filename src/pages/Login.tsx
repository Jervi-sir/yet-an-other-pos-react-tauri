import { useState } from 'react';
// import { useStore } from '@/context/StoreContext'; // Removed
import seed from '@/db/seed';
import { setUser, setSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  // const { login } = useStore(); // Removed
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const user = await res.json();
        setUser(user);

        // Start Session
        try {
          const sessionRes = await fetch('http://localhost:3000/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              start_time: new Date().toISOString(),
              opening_balance: 0,
              status: 'open'
            })
          });
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            setSession(session);
          }
        } catch (err) {
          console.error("Failed to start session", err);
        }

        navigate(user.role === 'cashier' ? '/pos' : '/');
      } else {
        const err = await res.json();
        setError(err.error || 'Login failed');
      }
    } catch (e) {
      setError('Connection refused');
    }
  };

  const handleSeed = async () => {
    if (!confirm("Are you sure you want to seed the database? This might reset data.")) return;
    try {
      await seed();
      alert("Seeding completed successfully!");
    } catch (err) {
      console.error(err);
      alert("Error seeding database. Check console.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your username below to login to your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" type="submit">Sign in</Button>
            <Button className="w-full" variant="outline" type="button" onClick={handleSeed}>
              Seed Database
            </Button>
          </CardFooter>
        </form>
        <div className="p-4 text-xs text-muted-foreground text-center">
          <p>Demo Credentials:</p>
          <p>admin / admin</p>
          <p>manager / manager</p>
          <p>cashier / cashier</p>
        </div>
      </Card>
    </div>
  );
}
