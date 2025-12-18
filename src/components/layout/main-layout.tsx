import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { ModeToggle } from '../mode-toggle';

export function MainLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-screen">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {/* Top bar content could go here, e.g. mobile toggle or global search */}
          <div className="w-full flex justify-end items-center">
            {/* Could add notifications or other top-bar items */}
          </div>
          <ModeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
