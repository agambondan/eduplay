export default function Footer() {
  return (
    <footer className="hidden border-t border-gray-200 bg-white py-6 md:block">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
        &copy; {new Date().getFullYear()} EduPlay. Semua Hak Cipta Dilindungi.
      </div>
    </footer>
  );
}
