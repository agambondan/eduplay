package seeder

import (
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/logger"
	"go.uber.org/zap"
)

// SeedGameContent seeds countries, chemical elements, history events, and wordle words.
// All operations are idempotent via FirstOrCreate.
func SeedGameContent() {
	seedCountries()
	seedChemicalElements()
	seedHistoryEvents()
	seedWordleWords()
}

func seedCountries() {
	countries := []model.Country{
		{Name: "Indonesia", Capital: "Jakarta", FlagEmoji: "🇮🇩", FlagCode: "ID", Region: "asia"},
		{Name: "Japan", Capital: "Tokyo", FlagEmoji: "🇯🇵", FlagCode: "JP", Region: "asia"},
		{Name: "China", Capital: "Beijing", FlagEmoji: "🇨🇳", FlagCode: "CN", Region: "asia"},
		{Name: "India", Capital: "New Delhi", FlagEmoji: "🇮🇳", FlagCode: "IN", Region: "asia"},
		{Name: "South Korea", Capital: "Seoul", FlagEmoji: "🇰🇷", FlagCode: "KR", Region: "asia"},
		{Name: "Thailand", Capital: "Bangkok", FlagEmoji: "🇹🇭", FlagCode: "TH", Region: "asia"},
		{Name: "Vietnam", Capital: "Hanoi", FlagEmoji: "🇻🇳", FlagCode: "VN", Region: "asia"},
		{Name: "Malaysia", Capital: "Kuala Lumpur", FlagEmoji: "🇲🇾", FlagCode: "MY", Region: "asia"},
		{Name: "Philippines", Capital: "Manila", FlagEmoji: "🇵🇭", FlagCode: "PH", Region: "asia"},
		{Name: "Singapore", Capital: "Singapore", FlagEmoji: "🇸🇬", FlagCode: "SG", Region: "asia"},
		{Name: "Australia", Capital: "Canberra", FlagEmoji: "🇦🇺", FlagCode: "AU", Region: "oceania"},
		{Name: "New Zealand", Capital: "Wellington", FlagEmoji: "🇳🇿", FlagCode: "NZ", Region: "oceania"},
		{Name: "United States", Capital: "Washington DC", FlagEmoji: "🇺🇸", FlagCode: "US", Region: "americas"},
		{Name: "Canada", Capital: "Ottawa", FlagEmoji: "🇨🇦", FlagCode: "CA", Region: "americas"},
		{Name: "Brazil", Capital: "Brasilia", FlagEmoji: "🇧🇷", FlagCode: "BR", Region: "americas"},
		{Name: "Mexico", Capital: "Mexico City", FlagEmoji: "🇲🇽", FlagCode: "MX", Region: "americas"},
		{Name: "Argentina", Capital: "Buenos Aires", FlagEmoji: "🇦🇷", FlagCode: "AR", Region: "americas"},
		{Name: "United Kingdom", Capital: "London", FlagEmoji: "🇬🇧", FlagCode: "GB", Region: "europe"},
		{Name: "France", Capital: "Paris", FlagEmoji: "🇫🇷", FlagCode: "FR", Region: "europe"},
		{Name: "Germany", Capital: "Berlin", FlagEmoji: "🇩🇪", FlagCode: "DE", Region: "europe"},
		{Name: "Italy", Capital: "Rome", FlagEmoji: "🇮🇹", FlagCode: "IT", Region: "europe"},
		{Name: "Spain", Capital: "Madrid", FlagEmoji: "🇪🇸", FlagCode: "ES", Region: "europe"},
		{Name: "Netherlands", Capital: "Amsterdam", FlagEmoji: "🇳🇱", FlagCode: "NL", Region: "europe"},
		{Name: "Sweden", Capital: "Stockholm", FlagEmoji: "🇸🇪", FlagCode: "SE", Region: "europe"},
		{Name: "Russia", Capital: "Moscow", FlagEmoji: "🇷🇺", FlagCode: "RU", Region: "europe"},
		{Name: "Turkey", Capital: "Ankara", FlagEmoji: "🇹🇷", FlagCode: "TR", Region: "europe"},
		{Name: "Egypt", Capital: "Cairo", FlagEmoji: "🇪🇬", FlagCode: "EG", Region: "africa"},
		{Name: "South Africa", Capital: "Pretoria", FlagEmoji: "🇿🇦", FlagCode: "ZA", Region: "africa"},
		{Name: "Nigeria", Capital: "Abuja", FlagEmoji: "🇳🇬", FlagCode: "NG", Region: "africa"},
		{Name: "Saudi Arabia", Capital: "Riyadh", FlagEmoji: "🇸🇦", FlagCode: "SA", Region: "asia"},
	}
	for _, c := range countries {
		database.DB.Where(model.Country{FlagCode: c.FlagCode}).FirstOrCreate(&c)
	}
	logger.Log.Info("seeded countries", zap.Int("count", len(countries)))
}

func seedChemicalElements() {
	elements := []model.ChemicalElement{
		{Symbol: "H", Name: "Hydrogen", Number: 1},
		{Symbol: "He", Name: "Helium", Number: 2},
		{Symbol: "Li", Name: "Lithium", Number: 3},
		{Symbol: "Be", Name: "Beryllium", Number: 4},
		{Symbol: "B", Name: "Boron", Number: 5},
		{Symbol: "C", Name: "Carbon", Number: 6},
		{Symbol: "N", Name: "Nitrogen", Number: 7},
		{Symbol: "O", Name: "Oxygen", Number: 8},
		{Symbol: "F", Name: "Fluorine", Number: 9},
		{Symbol: "Ne", Name: "Neon", Number: 10},
		{Symbol: "Na", Name: "Sodium", Number: 11},
		{Symbol: "Mg", Name: "Magnesium", Number: 12},
		{Symbol: "Al", Name: "Aluminum", Number: 13},
		{Symbol: "Si", Name: "Silicon", Number: 14},
		{Symbol: "P", Name: "Phosphorus", Number: 15},
		{Symbol: "S", Name: "Sulfur", Number: 16},
		{Symbol: "Cl", Name: "Chlorine", Number: 17},
		{Symbol: "Ar", Name: "Argon", Number: 18},
		{Symbol: "K", Name: "Potassium", Number: 19},
		{Symbol: "Ca", Name: "Calcium", Number: 20},
		{Symbol: "Fe", Name: "Iron", Number: 26},
		{Symbol: "Cu", Name: "Copper", Number: 29},
		{Symbol: "Zn", Name: "Zinc", Number: 30},
		{Symbol: "Ag", Name: "Silver", Number: 47},
		{Symbol: "Au", Name: "Gold", Number: 79},
		{Symbol: "Hg", Name: "Mercury", Number: 80},
		{Symbol: "Pb", Name: "Lead", Number: 82},
		{Symbol: "Ra", Name: "Radium", Number: 88},
		{Symbol: "U", Name: "Uranium", Number: 92},
		{Symbol: "Pu", Name: "Plutonium", Number: 94},
	}
	for _, e := range elements {
		database.DB.Where(model.ChemicalElement{Symbol: e.Symbol}).FirstOrCreate(&e)
	}
	logger.Log.Info("seeded chemical elements", zap.Int("count", len(elements)))
}

func seedHistoryEvents() {
	events := []model.HistoryEvent{
		// Indonesia
		{Description: "Proklamasi Kemerdekaan Republik Indonesia", Year: 1945, Region: "indonesia"},
		{Description: "Budi Utomo berdiri, organisasi modern pertama Indonesia", Year: 1908, Region: "indonesia"},
		{Description: "Konferensi Asia-Afrika di Bandung", Year: 1955, Region: "indonesia"},
		{Description: "G30S PKI — percobaan kudeta", Year: 1965, Region: "indonesia"},
		{Description: "Reformasi — Soeharto mengundurkan diri", Year: 1998, Region: "indonesia"},
		{Description: "Sumpah Pemuda dikumandangkan", Year: 1928, Region: "indonesia"},
		{Description: "Pengakuan kedaulatan RI oleh Belanda", Year: 1949, Region: "indonesia"},
		{Description: "Pendudukan Jepang di Indonesia dimulai", Year: 1942, Region: "indonesia"},
		{Description: "Supersemar ditandatangani Soekarno", Year: 1966, Region: "indonesia"},
		{Description: "Timor Timur bergabung dengan Indonesia", Year: 1975, Region: "indonesia"},
		// World
		{Description: "Neil Armstrong mendarat di Bulan (Apollo 11)", Year: 1969, Region: "world"},
		{Description: "Tembok Berlin runtuh", Year: 1989, Region: "world"},
		{Description: "Bom atom dijatuhkan di Hiroshima oleh Amerika", Year: 1945, Region: "world"},
		{Description: "Internet (ARPANET) pertama kali aktif", Year: 1969, Region: "world"},
		{Description: "Uni Soviet resmi bubar", Year: 1991, Region: "world"},
		{Description: "Serangan teroris 9/11 di Amerika Serikat", Year: 2001, Region: "world"},
		{Description: "Presiden John F. Kennedy dibunuh di Dallas", Year: 1963, Region: "world"},
		{Description: "Wright bersaudara melakukan penerbangan bertenaga mesin pertama", Year: 1903, Region: "world"},
		{Description: "Great Depression dimulai setelah krisis Wall Street", Year: 1929, Region: "world"},
		{Description: "Perang Dunia I dimulai setelah pembunuhan Franz Ferdinand", Year: 1914, Region: "world"},
	}
	for _, e := range events {
		database.DB.Where(model.HistoryEvent{Description: e.Description, Year: e.Year, Region: e.Region}).FirstOrCreate(&e)
	}
	logger.Log.Info("seeded history events", zap.Int("count", len(events)))
}

func seedWordleWords() {
	// All words below are verified to be exactly 5 characters long.
	words := []string{
		"makan", // m-a-k-a-n (5)
		"tidur", // t-i-d-u-r (5)
		"jalan", // j-a-l-a-n (5)
		"rumah", // r-u-m-a-h (5)
		"mobil", // m-o-b-i-l (5)
		"pohon", // p-o-h-o-n (5)
		"bunga", // b-u-n-g-a (5)
		"sinar", // s-i-n-a-r (5)
		"angin", // a-n-g-i-n (5)
		"hujan", // h-u-j-a-n (5)
		"panas", // p-a-n-a-s (5)
		"besar", // b-e-s-a-r (5)
		"kecil", // k-e-c-i-l (5)
		"putih", // p-u-t-i-h (5)
		"hitam", // h-i-t-a-m (5)
		"merah", // m-e-r-a-h (5)
		"hijau", // h-i-j-a-u (5)
		"bukan", // b-u-k-a-n (5)
		"boleh", // b-o-l-e-h (5)
		"semua", // s-e-m-u-a (5)
		"sudah", // s-u-d-a-h (5)
		"belum", // b-e-l-u-m (5)
		"salam", // s-a-l-a-m (5)
		"teman", // t-e-m-a-n (5)
		"keras", // k-e-r-a-s (5)
		"lemah", // l-e-m-a-h (5)
		"cepat", // c-e-p-a-t (5)
		"mudah", // m-u-d-a-h (5)
		"susah", // s-u-s-a-h (5)
		"benar", // b-e-n-a-r (5)
		"salah", // s-a-l-a-h (5)
		"bantu", // b-a-n-t-u (5)
		"pakai", // p-a-k-a-i (5)
		"ambil", // a-m-b-i-l (5)
		"pergi", // p-e-r-g-i (5)
		"balik", // b-a-l-i-k (5)
		"turun", // t-u-r-u-n (5)
		"takut", // t-a-k-u-t (5)
		"siang", // s-i-a-n-g (5)
		"malam", // m-a-l-a-m (5)
		"subuh", // s-u-b-u-h (5)
		"senja", // s-e-n-j-a (5)
		"kerja", // k-e-r-j-a (5)
		"bayar", // b-a-y-a-r (5)
		"harga", // h-a-r-g-a (5)
		"pasar", // p-a-s-a-r (5)
		"dapur", // d-a-p-u-r (5)
		"kamar", // k-a-m-a-r (5)
		"pintu", // p-i-n-t-u (5)
		"lampu", // l-a-m-p-u (5)
	}
	for _, w := range words {
		entry := model.WordleWord{Word: w, Language: "id"}
		database.DB.Where(model.WordleWord{Word: w, Language: "id"}).FirstOrCreate(&entry)
	}
	logger.Log.Info("seeded wordle words", zap.Int("count", len(words)))
}
