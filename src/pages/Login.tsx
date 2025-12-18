import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eq } from 'drizzle-orm';
import db from '@/db/database';
import { users, cashSessions } from '@/db/schema';
import { setUser, setSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { seedLarge } from '@/db/seed-large';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Find user
      const result = await db.select().from(users).where(eq(users.username, username));
      const user = result[0];

      if (!user) {
        setError('Invalid username or password');
        return;
      }

      // 2. Check password (simple verification for this demo / MVP)
      // In production, compare hashed passwords properly (e.g. using potential library if added)
      if (user.password_hash !== password) {
        setError('Invalid username or password');
        return;
      }

      if (!user.is_active) {
        setError('Account is disabled');
        return;
      }

      // 3. Set User to Local State
      // Convert nulls to undefined for compatibility with User interface
      const appUser = {
        ...user,
        email: user.email || undefined,
        role: user.role as any // cast string to UserRole
      };
      setUser(appUser);

      // 4. Start Session
      try {
        const [newSession] = await db.insert(cashSessions).values({
          user_id: user.id,
          start_time: new Date().toISOString(),
          opening_balance: 0,
          status: 'open'
        }).returning();

        const appSession = {
          ...newSession,
          end_time: newSession.end_time || undefined,
          expected_cash_balance: newSession.expected_cash_balance || undefined,
          actual_cash_balance: newSession.actual_cash_balance || undefined,
          difference: newSession.difference || undefined,
          status: newSession.status as any
        };
        setSession(appSession);
      } catch (err) {
        console.error("Failed to start session", err);
        // We might want to block login if session fails, or just warn.
        // For now, proceeding as the original code did (just logged error).
      }

      // 5. Navigate
      navigate(user.role === 'cashier' ? '/pos' : '/');

    } catch (e) {
      console.error(e);
      setError('An unexpected error occurred');
    }
  };

  const handleSeed = async () => {
    if (!confirm("Are you sure you want to seed the database? This might reset data.")) return;
    try {
      await seedLarge();
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
