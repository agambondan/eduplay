export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 hidden md:block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} EduPlay. Semua Hak Cipta Dilindungi.
      </div>
    </footer>
  );
}
