import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">Fitness App</span>
            </Link>
          </div>
          <div className="flex items-center">
            <Link href="/workouts" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900">
              Workouts
            </Link>
            <Link href="/nutrition" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900">
              Nutrition
            </Link>
            <Link href="/profile" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900">
              Profile
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
