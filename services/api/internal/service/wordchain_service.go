package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type WordChainService interface {
	CreateGame(userID string, opponentUsername string, vsBot bool, botDifficulty string) (*WordChainGameResponse, error)
	GetActiveGames(userID string) ([]WordChainGameResponse, error)
	GetGame(userID, gameID string) (*WordChainDetail, error)
	SubmitWord(userID, gameID, word string) (*WordSubmitResult, error)
}

type WordChainGameResponse struct {
	ID             string `json:"id"`
	OpponentName   string `json:"opponent_name"`
	IsVsBot        bool   `json:"is_vs_bot"`
	BotDifficulty  string `json:"bot_difficulty"`
	CurrentWord    string `json:"current_word"`
	MyTurn         bool   `json:"my_turn"`
	Player1Score   int    `json:"player1_score"`
	Player2Score   int    `json:"player2_score"`
	Status         string `json:"status"`
	TurnExpiresAt  string `json:"turn_expires_at"`
	CreatedAt      string `json:"created_at"`
}

type WordChainDetail struct {
	WordChainGameResponse
	WordsUsed  []string          `json:"words_used"`
	History    []WordHistoryItem `json:"history"`
}

type WordHistoryItem struct {
	PlayerName string `json:"player_name"`
	Word       string `json:"word"`
	Score      int    `json:"score"`
	Timestamp  string `json:"timestamp"`
}

type WordSubmitResult struct {
	Valid       bool   `json:"valid"`
	ScoreDelta  int    `json:"score_delta"`
	NextLetter  string `json:"next_letter"`
	BotResponse string `json:"bot_response,omitempty"`
	GameOver    bool   `json:"game_over"`
	WinnerID    string `json:"winner_id,omitempty"`
	Message     string `json:"message,omitempty"`
}

type wordChainService struct {
	cfg    *config.Config
	aiSvc  AIService
	words  map[rune][]string
}

func NewWordChainService(cfg *config.Config, aiSvc AIService) WordChainService {
	return &wordChainService{
		cfg:   cfg,
		aiSvc: aiSvc,
		words: buildWordDictionary(),
	}
}

var kbbiWords = []string{
	"abis", "acak", "adat", "adil", "aduk", "agak", "agar", "agem", "agia", "agog", "agon", "aguk",
	"ahad", "ahli", "aiya", "ajab", "ajak", "ajal", "ajar", "ajek", "akal", "akan", "akar",
	"akhl", "akib", "akik", "akil", "akor", "akrab", "akron", "aksara", "aktif", "aku", "akur",
	"alah", "alam", "alap", "alar", "alas", "alat", "alau", "albur", "alegro", "alem", "alfah",
	"algo", "alih", "alir", "alis", "alit", "aljabar", "alkah", "alkali", "alkana", "alkil",
	"almar", "almari", "alok", "alon", "alpa", "alquran", "altar", "alu", "alui", "alun", "alur",
	"alusi", "aluvial", "am", "ama", "amal", "aman", "amar", "amat", "ambak", "ambal", "amban",
	"ambar", "ambas", "ambek", "ambil", "ambin", "ambis", "amboi", "ambul", "ambung", "ameba",
	"amer", "amet", "amfibi", "amien", "amir", "amko", "amma", "amnesti", "amonia", "amor", "ampa",
	"ampai", "ampas", "ampat", "ampel", "ampon", "amprok", "ampuh", "ampul", "ampu", "amuk",
	"ana", "anai", "analog", "anals", "anang", "anani", "anarkis", "anarki", "anatomi", "anaw",
	"anca", "ancak", "ancam", "ancap", "ancuk", "anda", "andak", "andam", "andan", "andang",
	"andar", "andem", "ander", "andi", "andil", "anduk", "andun", "aneh", "aneka", "aner", "aneu",
	"angap", "angga", "anggal", "anggan", "anggap", "anggar", "angin", "angit",
	"angka", "angkak", "angkat", "angklung", "angkuh", "angkup", "angkur", "angkus", "angop", "angpau",
	"angsa", "angsal", "angsur", "anih", "anjak", "anjal", "anjang", "anjar", "anjing", "anjlok",
	"anjung", "anoa", "anode", "anom", "anona", "anot", "ansar", "antah", "antai", "antak", "antam",
	"antar", "antek", "antena", "anti", "antik", "anting", "antoi", "antok", "antre", "antri", "antup",
	"antus", "anu", "anual", "anugrah", "anuitas", "anulir", "anulus", "anyam", "anyar", "anyel",
	"anyih", "anyir", "apa", "apam", "apapun", "apel", "api", "apik", "aplaus", "aplikasi", "apotik",
	"april", "ara", "aral", "arang", "arbab", "arcas", "ardi", "area", "arena", "areometer", "arer",
	"argan", "argon", "ari", "aria", "arik", "aring", "aris", "aristokrasi", "arkati", "arketipe",
	"arkian", "arloji", "armada", "arnal", "aroma", "arsip", "arta", "artefak", "arteri", "artikel",
	"artis", "aruan", "aruk", "arun", "arus", "arwah", "arya", "as", "asal", "asam", "asan", "asar",
	"asasi", "asep", "aset", "asia", "asian", "asin", "asind", "asli", "asma", "asong", "aspal",
	"aspek", "aspirasi", "asri", "astaga", "aster", "astomi", "astra", "asu", "asuh", "asumsi",
	"asuransi", "asusila", "asut", "ata", "atap", "atas", "ateis", "atelit", "atensi", "atlas",
	"atlet", "atma", "atmosfer", "atom", "atraktif", "atur", "audiens", "audit", "aura", "aurat",
	"autarki", "autentik", "auto", "autopsi", "aval", "avertebrata", "avia", "avokad", "avontur",
	"ayah", "ayak", "ayal", "ayam", "ayan", "ayap", "ayar", "ayat", "ayo", "ayom", "ayu", "ayun",
	"ayut", "azab", "azal", "azan", "azas", "badai", "badak", "badan", "badar", "badik", "badui",
	"badut", "bagai", "bagan", "bagasi", "bagi", "bagus", "bahagi", "bahak", "baham", "bahan",
	"bahasa", "bahaya", "bahenol", "baheula", "bahu", "baik", "bajak", "bajang", "bajing", "baju",
	"baka", "bakal", "bakan", "bakar", "bakarat", "bakat", "bakau", "baku", "bakul", "bakung",
	"bala", "balada", "balai", "balairung", "balak", "balap", "balar", "balas", "balau", "baldi",
	"balela", "balerina", "balik", "baling", "balistik", "balkon", "balok", "balon", "balsam",
	"baluarti", "bambu", "ban", "bana", "banal", "banang", "banci", "bancuh", "bandan", "bandar",
	"bandel", "bandeng", "banding", "bandit", "bandos", "bandot", "bandul", "bandung", "bangai",
	"bangan", "bangar", "bangat", "bangau", "banget", "bangga", "bangir", "bangka", "bangkai",
	"bangkal", "bangkar", "bangkit", "bangkong", "bangkrut", "bangku", "bangsa", "bangun", "bani",
	"baning", "banjir", "bank", "bantah", "bantal", "bantam", "bantar", "bantat", "banteng",
	"banting", "bantu", "banyak", "banyo", "banyol", "banyu", "banzai", "bapa", "bapak", "bapet",
	"bar", "bara", "barai", "barang", "barat", "barbar", "barbel", "barbir", "barcet", "bard",
	"bareng", "baret", "barga", "bari", "barik", "baring", "baris", "barit", "barium", "barjong",
	"baron", "barongsai", "baru", "barua", "barulah", "barusan", "basah", "basal", "basan", "basat",
	"basekat", "basil", "basoka", "basuh", "bata", "batagor", "batako", "batal", "batang", "batar",
	"batas", "batau", "batel", "batik", "batil", "batin", "batu", "batuk", "bau", "baud", "bauk",
	"baur", "bausastra", "baut", "bawa", "bawah", "bawal", "bawang", "bawel", "baya", "bayak",
	"bayam", "bayan", "bayang", "bayar", "bayata", "bayi", "bayonet", "bayung", "bazar", "bea",
	"beak", "bebal", "beban", "bebas", "bebek", "bebekel", "bebeng", "bebent", "bebentulan",
	"bebesaran", "bebet", "bebola", "beborang", "becak", "becus", "beda", "bedah", "bedak", "bedal",
	"bedan", "bedaru", "bedawi", "bedaya", "bedebah", "bedegap", "bedel", "bedeng", "bedil",
	"beduk", "bedung", "begal", "begap", "begini", "begitu", "bego", "begu", "beguk", "begundal",
	"beha", "behena", "bejat", "bek", "beka", "bekal", "bekam", "bekantan", "bekas", "bekatul",
	"bekel", "beken", "beker", "bekicot", "bekisar", "bekleding", "bekles", "beku", "bel", "bela",
	"belacan", "belacu", "belah", "belai", "belajar", "belaka", "belakang", "belako", "belan",
	"belanda", "belandang", "belandar", "belang", "belanga", "belangkas", "belango", "belanja",
	"belantik", "belantuk", "belar", "belas", "belasting", "belat", "belati", "belatik", "belaton",
	"belatuk", "belau", "belawan", "bele", "belek", "belekok", "belembang", "belencong", "belendung",
	"belenggu", "belengket", "belenjong", "belenting", "belerang", "belerong", "beli", "belia",
	"beliak", "belian", "beliau", "belibis", "belida", "belih", "belik", "belimbing", "beling",
	"belintang", "belis", "belit", "beliung", "belo", "beloan", "belok", "belokok", "belolok",
	"belonggok", "belongkang", "belontok", "beloon", "belot", "belu", "belubur", "beludak",
	"beludar", "beluk", "belukap", "beluku", "belulang", "belum", "belung", "belungkang", "beluntas",
	"belur", "beluru", "belus", "belut", "bemban", "bembar", "bemuk", "bena", "benah", "benak",
	"benalu", "benam", "benang", "benar", "benara", "benatu", "bencah", "bencana", "bencat",
	"bencet", "bencong", "benda", "bendahara", "bendahari", "bendala", "bendang", "bendar",
	"bendara", "bendawi", "bendel", "bendera", "benderang", "bendi", "bendir", "bendo", "bendrat",
	"bendul", "bendung", "bene", "benefaktif", "bengal", "bengang", "bengap", "bengawan", "bengek",
	"bengep", "benggal", "benggol", "bengis", "bengkah", "bengkak", "bengkal", "bengkala",
	"bengkalai", "bengkang", "bengkar", "bengkarak", "bengkarung", "bengkatak", "bengkek",
	"bengkel", "bengkeng", "bengker", "bengkerap", "bengkil", "bengkoang", "bengkol", "bengkong",
	"bengku", "bengkuang", "bengkunang", "bengkung", "bengoh", "bengok", "bengong", "bengot",
	"benguk", "bengul", "bengung", "beni", "benian", "benih", "bening", "benjol", "benjut",
	"bensin", "bensol", "benta", "bentak", "bentala", "bentan", "bentang", "bentangkan", "bentatur",
	"bente", "benteng", "bentes", "bentet", "bentik", "bentoh", "bentok", "bentol", "bentong",
	"bentonit", "bentrok", "bentuk", "bentul", "bentulu", "bentur", "benturong", "bentus",
	"benua", "benuang", "benuaron", "benulung", "benur", "benyai", "benyek", "benyoh", "benyol",
	"benzoat", "ber", "bera", "berabe", "berahak", "berahi", "berai", "berair", "berak", "berakah",
	"berakal", "beraksen", "beraksi", "beraktifitas", "beralamat", "beralih", "beram", "berambah",
	"beramin", "beran", "berandai", "berandal", "berangan", "berangas", "berangai", "berangkal",
	"berangkap", "berangkat", "berangus", "berani", "beranta", "berantak", "berantas", "berapa",
	"beras", "berat", "bercak", "berdikari", "berdus", "beremban", "berendeng", "bereng", "berengau",
	"berenggil", "berengos", "berengsek", "berengut", "berentang", "bererot", "beres", "beret",
	"bergas", "berguk", "beri", "beriang", "beriani", "berida", "beriga", "berik", "berilium",
	"beringas", "beringin", "beringsang", "beringut", "berinjam", "beringsut",
	"berisik", "berita", "berkah", "berkas", "berkat", "berkik", "berkil", "berko", "berkung",
	"berlau", "berlian", "berma", "bermat", "berminyak", "bernas", "bernga", "beroci", "beroga",
	"berok", "beronak", "beronang", "berondok", "berondong", "beronga", "berongkol", "beronok",
	"berontak", "beron(t)" , "beroro", "beros", "bersat", "bersih", "bersin", "bersit", "bersut",
	"bertam", "bertih", "bertil", "beru", "beruang", "beruas", "berubuh", "berudu", "berui",
	"beruju", "berujul", "beruk", "berumbung", "berumbun", "berunding", "beruntus", "berus",
	"berwujud", "besar", "besaran", "besek", "besel", "besengek", "beser", "besero", "beset",
	"besi", "besing", "besit", "beskal", "beskap", "beslah", "beslit", "besok", "besot", "bestari",
	"bestek", "bestel", "bestial", "besuk", "besuta", "beta", "betah", "betak", "betapa", "betara",
	"betari", "betas", "betat", "betau", "bete", "betet", "beti", "betik", "betina", "beting",
	"betis", "betok", "beton", "betsy", "betung", "betutu", "bewok", "bhayangkara", "biadab",
	"biadik", "biah", "biak", "bial", "biam", "biang", "bianglala", "biap", "biar", "biara",
	"biarpet", "biasa", "biaya", "bibel", "bibit", "biblio", "bicara", "bicokok", "bicu", "bida",
	"bidai", "bidak", "bidal", "bidan", "bidang", "bidar", "bidara", "bidari", "bidas", "bidik",
	"bido", "biduan", "biduanda", "biduk", "biel", "biennale", "bifokal", "bigair", "bigami",
	"bigar", "bigo", "bigot", "bihun", "bijak", "bijaksana", "bijaksanawan", "biji", "bijih",
	"bik", "bikameral", "bikang", "bikarbonat", "bikin", "bikini", "bikir", "bikonkaf", "bikonkav",
	"bikromat", "biksah", "biksu", "biksuni", "bikut", "bila", "bilah", "bilal", "bilamana",
	"bilamasa", "bilang", "bilar", "bilas", "bilat", "bilaterial", "bilek", "bilga", "bilhak",
	"biliar", "bilik", "bilingual", "bilis", "billon", "bilo", "bils", "bilyar", "bilyet", "bima",
	"bimasakti", "bimbang", "bimbing", "bimbit", "bimetal", "bin", "bina", "binaga", "binal",
	"binar", "binara", "binaraga", "binasa", "binatang", "binawah", "binayah", "bincacak", "bincacau",
	"bincang", "bincu", "bincul", "bincut", "bindam", "bindeng", "bindik", "bineka", "bingas",
	"bingit", "bingka", "bingkah", "bingkai", "bingkas", "bingkatak", "bingkis", "bingung",
	"bini", "binkel", "binkhal", "biodata", "biofisik", "biografi", "biokimia", "biola", "biologi",
	"bionik", "bioritme", "biosfer", "biota", "bipatride", "bipolar", "birahi", "birai", "biram",
	"birang", "biras", "birat", "birer", "biri", "birih", "biring", "birit", "biro", "birofaks",
	"birokrasi", "birokrat", "biru", "bis", "bisai", "bisawab", "bisbol", "biseksual", "biseps",
	"bising", "biskuit", "bismillah", "bison", "bissu", "bistik", "bisu", "bisul", "bit", "biti",
	"bitis", "bitumen", "biuku", "bius", "bivak", "bizurai", "blabar", "blabitisme", "blakblakan",
	"blangko", "blantik", "blaster", "blastula", "blekek", "blekok", "blenda", "blender", "blepotan",
	"bles", "bletek", "bletok", "bligo", "blimbing", "blinde", "blok", "blokir", "blokade",
	"blombang", "blong", "blower", "blue", "blus", "blustru", "bobato", "bobok", "bobol", "bobot",
	"bobotok", "bocah", "bocok", "bocor", "bodhi", "bodi", "bodoh", "bodok", "bodong", "bodor",
	"boga", "bogam", "bogem", "bogi", "bogol", "bogor", "bogot", "bohemian", "bohlam", "bohong",
	"bohorok", "boi", "boikot", "bois", "bok", "boko", "bokoh", "bokong", "boks", "boksen",
	"bokser", "bokset", "boku", "bola", "bolah", "bolak", "bolang", "boleh", "bolero", "bolide",
	"boling", "boloh", "bolok", "bolong", "bolos", "bolot", "bolu", "bom", "bombai", "bombardir",
	"bombas", "bomber", "bomoh", "bomseks", "bon", "bona", "bonafid", "bonang", "bonar", "bonbon",
	"bonceng", "boncol", "boncos", "bondol", "bondong", "bondot", "boneka", "bonet", "bong",
	"bongak", "bonggol", "bongkah", "bongkak", "bongkar", "bongkin", "bongkok", "bongkol",
	"bongkong", "bongkor", "bongkot", "bongkrek", "bongmeh", "bongo", "bongok", "bongsai",
	"bongsang", "bongso", "bonian", "bonir", "bonjor", "bonnet", "bonsai", "bontak", "bontang",
	"bonteng", "bonto", "bontok", "bontot", "bonus", "bonyok", "bopeng", "boplang", "bopok",
	"bopor", "bor", "bora", "bordil", "bordir", "boreal", "boreh", "borek", "borgol", "borjuasi",
	"borjuis", "borok", "boron", "borong", "boros", "bortol", "bos", "bosan", "bosman", "boson",
	"bosor", "bostan", "bot", "botak", "botang", "botani", "botas", "botok", "botol", "botor",
	"botuh", "botul", "bowo", "boya", "boyak", "boyan", "boyas", "boyo", "boyong", "bozah",
	"bradikardi", "brahma", "brahmana", "brahmani", "brahmi", "brahmin", "braille", "brakiasi",
	"brakisefalik", "brakista", "bramacorah", "brander", "brangas", "brangus", "bras", "bravura",
	"breksi", "brendi", "brengsek", "brenjet", "brevet", "bridesmaid", "brifing", "briket", "brilian",
	"briofita", "briologi", "british", "broiler", "brokat", "broker", "brom", "bromid", "bromin",
	"bromocorah", "bronkioli", "bronkitis", "bronkos", "bronze", "bros", "brosur", "bruder",
	"bruk", "brunai", "brutal", "buah", "buai", "buak", "bual", "buana", "buang", "buani",
	"buar", "buari", "buas", "buat", "buaya", "bubar", "bubo", "bubuh", "bubuhan", "bubuk",
	"bubul", "bubun", "bubung", "bubur", "bubus", "bubut", "bucu", "budak", "budan", "budaya",
	"buddha", "budi", "buduk", "budur", "bueng", "bufer", "bufet", "bugar", "bugil", "buhuk",
	"buhul", "bui", "buih", "bujal", "bujang", "bujar", "bujuk", "bujur", "bujut", "buk",
	"buka", "bukan", "bukat", "bukau", "buket", "bukit", "bukti", "buku", "bukuh", "bukung",
	"bulai", "bulak", "bulan", "bulang", "bulat", "bulbul", "buldan", "buldog", "buldoser",
	"bule", "buleng", "buletin", "bulgur", "buli", "bulian", "bulimia", "bulir", "bulsak",
	"bulu", "buluh", "buluk", "bulum", "bulur", "bulus", "bum", "bumel", "bumerang", "bumi",
	"bumiah", "bumpet", "bumping", "bun", "buncah", "buncak", "buncang", "buncel", "bunceng",
	"buncis", "buncit", "bunda", "bundak", "bundar", "bundas", "bundel", "bunduk", "bundung",
	"bung", "bunga", "bungah", "bungalo", "bungar", "bungkal", "bungkam", "bungker", "bungkil",
	"bungkus", "bunglon", "bungo", "bungsil", "bungsu", "bungur", "buni", "bunian", "bunih",
	"bunyi", "bupala", "bupati", "bupet", "bur", "bura", "burai", "burak", "burakah", "buraksa",
	"buram", "buras", "burat", "burayak", "burdah", "bureng", "buret", "burgang", "burhan",
	"burik", "burit", "burkak", "buron", "bursa", "buru", "buruh", "buruk", "burung", "burut",
	"bus", "busa", "busana", "buset", "bushido", "busi", "busik", "bustan", "buster", "busuk",
	"busung", "busur", "busut", "buta", "butala", "butana", "butarepan", "butbut", "butek",
	"butik", "butir", "butong", "butuh", "butul", "butung", "butut", "buwuh", "cabai", "cabak",
	"cabang", "cabar", "cabik", "cabir", "cabo", "cabuh", "cabuk", "cabul", "cabur", "cabut",
	"cacah", "cacak", "cacap", "cacar", "cacat", "cacau", "caci", "cacibar", "cacil", "cacing",
	"cadai", "cadang", "cadar", "cadas", "cadel", "cadik", "cadok", "cadong", "caduk", "cadung",
	"cagak", "cagar", "cagil", "cagu", "caguh", "cagun", "cah", "cahang", "cahar", "cahari",
	"cahaya", "cak", "cakah", "cakak", "cakal", "cakalang", "cakap", "cakawari", "cakela",
	"cakep", "caki", "cakil", "cakmar", "cakok", "cakrabirawa", "cakram", "cakrawala", "cakrawati",
	"cakruk", "cakue", "cakup", "cakur", "cakus", "cal", "calabikang", "caladi", "calak", "calang",
	"calar", "calecer", "calit", "calo", "calon", "calui", "caluk", "calung", "cam", "camar",
	"camat", "camau", "cambang", "cambuk", "cambung", "camca", "campa", "campah", "campak",
	"campang", "campin", "camping", "camplung", "campuh", "campung", "camuk", "camur", "canai",
	"canak", "canang", "cancan", "cancang", "cancut", "canda", "candai", "candak", "candan",
	"candang", "candi", "candik", "candit", "candra", "candu", "candung", "cang", "cangah",
	"cangak", "cangap", "cangar", "cangcang", "cangga", "canggaan", "canggah", "canggai",
	"canggal", "cangget", "canggung", "cangkang", "cangkat", "cangkih", "cangking", "cangkir",
	"cangklong", "cangkok", "cangkol", "cangkriman", "cangkuk", "cangkul", "cangkum", "cangkung",
	"cangkup", "cangor", "canguk", "cangut", "canji", "cantas", "cante", "cantel", "canteng",
	"cantik", "canting", "cantol", "canton", "cantrik", "cantum", "caos", "cap", "capa", "capah",
	"capai", "capak", "capal", "capang", "capar", "capcai", "capek", "capil", "caping", "capit",
	"capjiki", "caplok", "caplong", "capuk", "capung", "cara", "carah", "carak", "caraka",
	"caram", "caran", "carang", "caren", "cari", "carik", "caring", "carta", "caruk", "carut",
	"cas", "casis", "cata", "catat", "catek", "cath", "catu", "catuk", "catur", "catut",
	"caung", "cawai", "cawan", "cawangan", "cawat", "cawi", "cawis", "cebak", "ceban", "cebesar",
	"cebik", "cebikas", "cebir", "ceboh", "cebok", "cebol", "cebong", "cebur", "cecah", "cecak",
	"cecer", "cecere", "cecok", "cecongor", "cecunguk", "cedak", "cedal", "cedayam", "cede",
	"cedera", "cedok", "cedong", "cegah", "cegar", "ceguk", "cek", "cekah", "cekak", "cekakan",
	"cekal", "cekam", "cekang", "cekar", "cekau", "cekcekcek", "cekdam", "cekek", "cekel",
	"ceker", "ceki", "cekibar", "cekih", "cekik", "cekikik", "ceking", "cekit", "cekluk",
	"cekok", "cekrem", "ceku", "cekuh", "cekuk", "cekung", "cekur", "celah", "celak", "celaka",
	"celamik", "celana", "celang", "celapak", "celar", "celari", "celas", "celat", "celating",
	"cele", "celebuk", "celedang", "celek", "celemek", "celemotan", "celengan", "celengkak",
	"celentang", "celep", "celering", "celerit", "celi", "celih", "celik", "celinguk", "celingus",
	"celis", "celok", "celomes", "celomok", "celonok", "celopap", "celorot", "celoteh", "celsius",
	"celuk", "celum", "celung", "celup", "celupak", "celur", "celuring", "celurit", "celus",
	"celutak", "celutuk", "cema", "cemara", "cemas", "cemat", "cembeng", "cemberut", "cembul",
	"cembung", "cemburu", "cemceb", "cemeeh", "cemeh", "cemek", "cemekian", "cemengkian",
	"cemer", "cemerlang", "cemeti", "cemetuk", "cemomot", "cemong", "cemooh", "cempa", "cempaka",
	"cempal", "cempala", "cempana", "cempe", "cempedak", "cempek", "cempelik", "cempeng",
	"cemperling", "cempiang", "cemplung", "cempor", "cempreng", "cempung", "cempurit", "cemuas",
	"cemuk", "cena", "cenak", "cenal", "cenangau", "cenangkas", "cenayang", "cencala", "cencaluk",
	"cencang", "cencaru", "cencawan", "cencawi", "cendala", "cendana", "cendang", "cendawan",
	"cendaya", "cendekia", "cendera", "cenderai", "cenderasa", "cenderawasih", "cenderung",
	"cendet", "cendol", "cenduai", "cenela", "ceng", "cengal", "cengam", "cengap", "cengbeng",
	"cenge", "cengeh", "cengek", "cengeng", "cengengesan", "cenggek", "cengger", "cenggeret",
	"cengi", "cengil", "cengis", "cengkal", "cengkam", "cengkar", "cengkaruk", "cengkau",
	"cengkedi", "cengkeh", "cengkek", "cengkelong", "cengkeram", "cengkerama", "cengkerawak",
	"cengkerik", "cengkering", "cengki", "cengkiak", "cengkih", "cengking", "cengkir", "cengkiwing",
	"cengkodok", "cengkok", "cengkol", "cengkong", "cengkuk", "cengkuyung", "cengli", "cengung",
	"cengut", "cenik", "centang", "centeng", "centet", "centil", "centong", "centung", "cenung",
	"cepak", "cepal", "cepaplah", "cepat", "cepek", "cepeng", "ceper", "ceplas", "ceples", "ceplok",
	"ceplos", "cepo", "cepol", "cepu", "cepuk", "ceracak", "ceracam", "ceracap", "cerah",
	"cerai", "cerak", "ceraka", "cerakin", "ceramah", "cerana", "cerancang", "cerang", "ceranggah",
	"cerangka", "cerap", "cerat", "ceratai", "ceratuk", "cerau", "cerca", "cercah", "cercak",
	"cerco", "cere", "cerecek", "cerek", "cerempung", "ceremuk", "ceret", "cerewet", "cergas",
	"ceri", "ceria", "cericap", "cericau", "ceriga", "cerik", "ceril", "cerita", "ceriwis",
	"cerkam", "cerkan", "cerkau", "cermai", "cermat", "cermin", "cerminan", "cerna", "ceroboh",
	"cerobong", "cerocok", "cerocos", "cerompong", "ceronggah", "ceronggang", "cerotok", "cerowok",
	"cerpelai", "cerpen", "cerpu", "cerucuh", "cerucup", "ceruh", "ceruk", "cerun", "cerung",
	"cerup", "cerut", "cerutu", "cespleng", "cetai", "cetak", "cetar", "cetek", "ceteng",
	"ceter", "cetera", "ceti", "cetok", "cetus", "ceuki", "cewa", "cewok", "ciak", "cialat",
	"ciam", "ciamis", "cian", "ciap", "ciar", "cibir", "cibit", "cibuk", "cicil", "cicinda",
	"cicip", "cicit", "cidomo", "ciduk", "cidur", "cigak", "cih", "cihur", "ciil", "cik",
	"cika", "cikadas", "cikal", "cikar", "cikok", "cikrak", "ciku", "cikun", "cikur", "cilap",
	"cilawung", "cilik", "ciling", "cilok", "cilukba", "cindai", "cindaku", "cinde", "cindur",
	"cing", "cingak", "cingam", "cingang", "cingge", "cingkat", "cingkeh", "cingkrang", "cingur",
	"cinta", "cintamani", "cinteng", "cintrong", "cip", "cipai", "cipan", "cipir", "ciplak",
	"cipluk", "cipok", "cipon", "ciprat", "cipta", "cir", "circir", "ciri", "cirit", "cirkus",
	"ciru", "cis", "cisampang", "cit", "cita", "citra", "citu", "cium", "ciut", "coak", "coang",
	"coba", "coban", "cobek", "coblos", "cocok", "cocor", "codak", "codang", "codet", "codot",
	"cogah", "cogok", "cokelat", "coket", "coklat", "cokmar", "cokok", "cokol", "cokor", "colek",
	"coleng", "colet", "coli", "colok", "colong", "colot", "comat", "comberan", "comblang",
	"combong", "comek", "comel", "comor", "compeng", "compes", "comro", "comot", "compang",
	"condong", "congak", "congeh", "congek", "conggah", "congget", "conggok", "congkak", "congki",
	"congklak", "congkok", "congkong", "congo", "congok", "congol", "congor", "congsam", "conteng",
	"contoh", "contong", "cop", "copal", "copet", "coplok", "copot", "cor", "corak", "corat",
	"corek", "coreng", "coret", "coro", "corob", "corong", "corot", "cotet", "cotok", "cowet",
	"cowok", "crat", "crit", "cuaca", "cuai", "cuak", "cual", "cuang", "cuar", "cuat", "cubang",
	"cubit", "cublik", "cubung", "cucak", "cucu", "cucuh", "cucuk", "cucun", "cucung", "cucup",
	"cucur", "cucut", "cudang", "cuek", "cugat", "cuh", "cuik", "cuil", "cuit", "cuk", "cuka",
	"cukai", "cukam", "cukil", "cukimai", "cukit", "cukong", "cuku", "cukup", "cukur", "cula",
	"culak", "culan", "culas", "culi", "culik", "cuma", "cuman", "cumbu", "cumepak", "cumil",
	"cuming", "cumi", "cumlaude", "cumpak", "cun", "cunam", "cunang", "cung", "cungap", "cungkil",
	"cungkup", "cungo", "cunguk", "cungul", "cungur", "cunia", "cunihin", "cup", "cupai", "cupak",
	"cupang", "cupar", "cupet", "cuping", "cuplik", "cupul", "cur", "cura", "curah", "curai",
	"curam", "curang", "curat", "cureng", "curi", "curiah", "curiga", "curik", "curna", "curu",
	"cus", "cut", "cutak", "cutbrai", "cutel", "cuti", "daba", "dabak", "dabal", "dabih", "dabik",
	"dabing", "dabir", "dabit", "dables", "dabung", "dabus", "dacin", "dadah", "dadak", "dadal",
	"dadali", "dadap", "dadar", "dadek", "dadi", "dadih", "dadir", "daduh", "daduk", "dadung",
	"daeng", "daerah", "daerman", "daftar", "daga", "dagang", "dage", "dagel", "dagi", "daging",
	"dagu", "dah", "dahaga", "dahagi", "dahak", "daham", "dahan", "dahanam", "dahar", "dahi",
	"dahiat", "dahina", "dahlia", "dahriah", "dahsyat", "dahulu", "dai", "daidan", "daidanco",
	"daik", "daing", "daitia", "dajal", "daka", "dakah", "dakar", "dakron", "daksina", "daktil",
	"daktilitis", "daku", "dakwa", "dakwah", "dalal", "dalalah", "dalam", "dalang", "daldaru",
	"dalem", "dalfin", "dali", "dalidali", "dalih", "dalil", "dalton", "dalu", "daluang", "dam",
	"damah", "damai", "damak", "damal", "daman", "damar", "damat", "damba", "dambin", "dambir",
	"dambun", "dame", "dami", "damik", "damotin", "dan", "dana", "danau", "danawa", "danda",
	"dandan", "dandang", "dandanggula", "dandos", "dandrum", "danedan", "dang", "dangai", "danghyang",
	"dangir", "dangka", "dangkal", "dangkap", "dangkar", "dangkung", "danguk", "dangus", "danik",
	"danur", "danyang", "dap", "dapa", "dapar", "dapat", "dapra", "dapur", "dar", "dara",
	"darab", "darah", "daras", "darat", "darau", "darbar", "darda", "darel", "daren", "darji",
	"darling", "darma", "darmabakti", "darmasiswa", "darmatirta", "darmawisata", "darojat",
	"darun", "darurat", "darus", "das", "dasa", "dasalomba", "dasar", "dasarian", "dasasila",
	"dasatitah", "dasbor", "dasi", "dasin", "dastar", "dasun", "data", "datang", "datar",
	"datuk", "datur", "dauk", "daulat", "daun", "daur", "dawai", "dawan", "dawat", "dawet",
	"daya", "dayah", "dayang", "dayu", "dayuh", "dayuk", "dayung", "dayus", "de", "deal",
	"dealer", "debab", "debak", "debal", "debam", "debap", "debar", "debarkasi", "debas",
	"debat", "debet", "debik", "debil", "debing", "debit", "debitur", "debris", "debu", "debug",
	"debuk", "debum", "debun", "debung", "debup", "debur", "debus", "debut", "decak", "decap",
	"deceh", "decing", "decit", "decup", "decur", "dedah", "dedai", "dedak", "dedal", "dedalu",
	"dedap", "dedar", "dedare", "dedas", "dedau", "dedek", "dedel", "dedemit", "dedengkot",
	"deder", "dedes", "dedikasi", "dedikatif", "deduksi", "deduktif", "deet", "defender",
	"defensi", "defensif", "defile", "definisi", "definitif", "deflasi", "defleksi", "deforestasi",
	"deg", "degam", "degan", "degap", "degar", "degen", "degenerasi", "degil", "deging", "degub",
	"deguk", "degum", "degung", "degup", "deh", "dehidrasi", "dehumanisasi", "deideologisasi",
	"deifikasi", "deiksis", "deis", "déjà", "dejectie", "dek", "dekah", "dekak", "dekal",
	"dekam", "dekan", "dekantasi", "dekap", "dekar", "dekard", "dekas", "dekasegi", "dekat",
	"dekik", "deklaim", "deklamasi", "deklarasi", "deklasifikasi", "deklerer", "deklinasi",
	"dekode", "dekomposer", "dekomposisi", "dekonsentrasi", "dekor", "dekorasi", "dekoratif",
	"dekorator", "dekosistem", "dekrem", "deksura", "dektil", "dekade", "dekaden", "dekadensi",
	"delabialisasi", "delah", "delamak", "delan", "delap", "delapan", "delas", "delat", "delator",
	"delegasi", "delegat", "de lemon", "deler", "delik", "delima", "delineasi", "delinkuen",
	"delirium", "delman", "delong", "delta", "delu", "deluang", "delus", "dem", "demagog",
	"demah", "demam", "demang", "demap", "demarkasi", "dembai", "dembun", "demek", "demen",
	"demes", "demi", "demisioner", "demit", "demo", "demobilisasi", "demografis", "demokrasi",
	"demon", "demonstrasi", "demonstratif", "demoralisasi", "dempak", "dempam", "dempang",
	"demper", "dempet", "dempir", "demplon", "dempok", "dempul", "dempung", "demuk", "demung",
	"den", "dena", "denah", "denai", "denak", "dencang", "dencing", "denda", "dendam", "dendang",
	"dendeng", "dendi", "dendik", "denetic", "deng", "dengak", "dengan", "dengap", "dengih",
	"denging", "dengkang", "dengkel", "dengki", "dengkik", "dengking", "dengklik",
	"dengkol", "dengkul", "dengkung", "dengkur", "dengkus", "dengu", "denguh", "denguk", "dengul",
	"dengung", "dengus", "dengut", "denim", "denok", "denong", "denotasi", "denpasar", "densan",
	"densimeter", "densitas", "dental", "dentam", "dentang", "denting", "dentum", "dentung",
	"dentur", "denudasi", "denyit", "denyut", "depa", "depak", "depan", "depang", "depap",
	"departemen", "departementalisasi", "dependen", "dependensi", "depersonalisasi", "depigmentasi",
	"depilasi", "deplesi", "depo", "depolitisasi", "deponir", "depopulasi", "deportasi",
	"deposisi", "deposit", "deposito", "depot", "depresi", "depresiasi", "depresor", "deprok",
	"depun", "depus", "der", "dera", "deragem", "derah", "derai", "derajah", "derajang",
	"derajat", "derak", "deram", "deran", "derana", "derang", "derap", "deras", "derau",
	"derawa", "derebar", "deregulasi", "derek", "derel", "derem", "derempet", "dereng", "deres",
	"deresi", "deret", "dergam", "dergama", "derham", "deria", "derik", "dering", "deris",
	"derit", "derita", "derivasi", "derivat", "derkuku", "derma", "dermaga", "derman", "dermawan",
	"dermoid", "dero", "derojat", "deros", "deru", "deruk", "derum", "derun", "derung",
	"derup", "derus", "desa", "desah", "desain", "desainer", "desak", "desar", "desas", "desasdesus",
	"desau", "desegregasi", "deselerasi", "desember", "desentralisasi", "deserebrasi", "desersi",
	"desertir", "desibel", "desidua", "desigram", "desih", "desik", "desimal", "desimeter",
	"desinens", "desinfektan", "desing", "desir", "desis", "desit", "deskripsi", "deskriptif",
	"deskuamasi", "desmon", "desolasi", "desorpsi", "desorasi", "destabilisasi", "destar",
	"destinasi", "destruksi", "destruktif", "desuk", "desup", "desur", "desus", "detak", "detap",
	"detar", "detas", "detasemen", "detasering", "deteksi", "detektif", "detektor", "detenidos",
	"detensi", "detente", "detergen", "deteriorasi", "determinan", "determinasi", "determinis",
	"detik", "deting", "detoksifikasi", "detonasi", "detonator", "detritus", "deuces", "devaluasi",
	"deviden", "deviasi", "devisa", "devosi", "dewa", "dewala", "dewan", "dewana", "dewangga",
	"dewasa", "dewata", "dewi", "dezah", "dezinfeksi", "di", "dia", "diabetes", "diad", "diadem",
	"diafon", "diafragma", "diag", "diagnosa", "diagnosis", "diagnostik", "diagometer", "diagonal",
	"diagram", "diajeng", "diaken", "dialek", "dialektik", "dialektika", "dialektis", "dialel",
	"dialis", "dialog", "dialogis", "diam", "diamagnetisme", "diameter", "diamorf", "dian",
	"diang", "diaper", "diapositif", "diar", "diare", "diarit", "dias", "diaskop", "diastol",
	"diat", "diatipe", "diatonik", "diaudi", "dibang", "didaktik", "didaktikus", "dideng", "didih",
	"didik", "didis", "didor", "die", "dieduk", "diesel", "diet", "dietetika", "difabel",
	"diferensial", "diferensiasi", "difluensi", "difraksi", "difteri", "diftong", "difusi",
	"digdaya", "digenesis", "digest", "digit", "digital", "diglosia", "dignitas", "digresi",
	"dik", "dikara", "dikau", "dikdasmen", "diksa", "diksi", "diktat", "diktator", "dil",
	"dilamen", "dilan", "dilasi", "dilatasi", "dilator", "dilema", "dilematis", "diler",
	"diligensi", "diluvium", "dim", "dimensi", "diminutif", "dimorf", "din", "dina", "dinamik",
	"dinamika", "dinamiki", "dinamit", "dinamo", "dinamometer", "dinar", "dinasti", "dinding",
	"dingin", "dingkis", "dingkit", "dingklik", "dingo", "dini", "diniah", "dinosaurus", "diode",
	"diol", "diopsida", "dioptase", "dioptri", "diorama", "diorit", "diose", "dipan", "diper",
	"diploma", "diplomasi", "diplomat", "dipresi", "dipsomania", "diptera", "diptotos", "dirah",
	"diras", "dirgahayu", "dirham", "diri", "dirigen", "diris", "dirus", "disagio", "disainer",
	"disajikan", "disakarida", "disarankan", "disastr", "disburse", "disc", "disensor", "disentralisasi",
	"disertasi", "disfonia", "disfungsi", "disharmoni", "disiden", "disilabik", "disinfektan",
	"disinformasi", "disinsentif", "disintegrasi", "disiplin", "disjoki", "disjungsi", "disjungtif",
	"diska", "disket", "diskiasis", "disklimaks", "disko", "diskoid", "diskon", "diskontinuitas",
	"diskordans", "diskotek", "diskredit", "diskrepansi", "diskresi", "diskriminasi", "diskriminator",
	"diskualifikasi", "diskulpasi", "diskursif", "diskus", "diskusi", "dislalia", "disleksia",
	"dislokasi", "dismembrasio", "dismenore", "dismissal", "disorientasi", "disosiasi", "dispareunia",
	"disparitas", "dispensasi", "dispenser", "dispepsia", "dispersi", "displasia", "disposisi",
	"disprosium", "disrupsi", "dissecting", "distal", "distansi", "distikiasis", "distikon",
	"distilasi", "distingsi", "distingtif", "distorsi", "distosia", "distribusi", "distributor",
	"diuresis", "diuretic", "diurnal", "divergen", "diversifikasi", "diversitas", "dividen",
	"divisi", "doa", "doang", "dobi", "doble", "dobol", "dobolo", "dobrak", "dodekagon", "dodekahedron",
	"dodol", "dodong", "dodor", "dodos", "dodot", "doeloe", "dogel", "dogeng", "doger", "dogma",
	"dogmatik", "dogmatis", "dogo", "dogs", "doh", "dok", "dokar", "doko", "dokoh", "dokok", "doktor",
	"doktrin", "dokumen", "dokumentasi", "dol", "dolan", "dolar", "doldrum", "dolfin", "dolim",
	"dolmen", "dolomit", "dom", "domain", "domba", "domblong", "domein", "domestik", "dominan",
	"dominasi", "dominggo", "dominion", "domino", "dompak", "dompet", "domplang", "dompleng", "dompol",
	"donasi", "donat", "donatur", "dondang", "donder", "dondon", "dong", "dongak", "dongeng",
	"dongkak", "dongkel", "dongkok", "dongkol", "dongkrak", "dongok", "dongpan", "dongsok",
	"doni", "donor", "donto", "dop", "dopis", "dor", "dorbi", "dorman", "dorna", "dorong",
	"dorsal", "dorslah", "dorsopalatal", "dorstrap", "dosa", "dosen", "dosir", "dosis", "dot",
	"dowel", "dower", "doyak", "doyan", "doyo", "doyong", "draf", "dragon", "drai", "drainase",
	"drama", "dramatik", "dramatisasi", "dramaturgi", "drap", "drastis", "drat", "drel", "dreso",
	"dresur", "dribel", "dril", "drip", "drop", "dropsi", "drum", "drumben", "drumer", "druwe",
	"dua", "duafa", "duai", "duak", "dualisme", "duane", "duangsom", "dub", "dubalang", "dubing",
	"dubius", "duble", "dublir", "dubuk", "dubur", "duda", "dudai", "dudak", "dudan", "duduk",
	"dudur", "dudus", "duel", "duet", "duga", "dugal", "dugang", "dugas", "dugen", "dugong",
	"duh", "duha", "duhai", "duhe", "duilah", "duit", "duk", "duka", "dukacita", "dukana",
	"dukat", "duktus", "duku", "dukuh", "dukun", "dukung", "dula", "dulang", "duli", "dulur",
	"dum", "dumdum", "dumi", "dumping", "dumung", "dunah", "dung", "dungas", "dungkelan", "dungki",
	"dungkul", "dungu", "dunia", "dunk", "dunsanak", "duodenum", "duolok", "duplik", "duplikasi",
	"duplikat", "duplikator", "duplisitas", "dupondium", "dur", "dura", "durasi", "duren", "duri",
	"durian", "durias", "duriat", "durja", "durjana", "durjasa", "durna", "durno", "dursila",
	"duru", "durung", "dus", "dusin", "dusta", "dustur", "dusun", "duta", "duwegan", "duwet",
	"duyun", "duyung", "dwibahasa", "dwidarma", "dwifungsi", "dwijati", "dwilingga", "dwimatra",
	"dwiminggu", "dwipamban", "dwipurwa", "dwisegi", "dwitarung", "dwitunggal", "ebam", "eban",
	"ebek", "ebi", "eboni", "ebonit", "ecek", "eceng", "ecer", "eco", "edafik", "edafologi",
	"edan", "edar", "edisi", "edit", "editor", "edukasi", "edukatif", "ef", "efektif", "efektivitas",
	"efektor", "efelis", "efendi", "efisien", "efisiensi", "efloresensi", "eforus", "egal",
	"egaliter", "egat", "ego", "egois", "egoisme", "egoistis", "egol", "egomania", "egos",
	"egrang", "egresif", "eh", "ehe", "eidetik", "eigendom", "eikosan", "einsteinium", "eja",
	"ejakulasi", "ejan", "ejawantah", "ejek", "ejektif", "ejektor", "ekaristi", "ekat", "ekbal",
	"ekdemik", "ekderon", "ekdisis", "ekeh", "ekimosis", "ekiofit", "eklektik", "eklektisisme",
	"eklips", "ekliptika", "eklosi", "ekofisiologi", "ekofraksi", "ekokardiografi", "ekologi",
	"ekologis", "ekonometri", "ekonomi", "ekonomis", "ekopolitik", "ekopraksis", "ekor",
	"ekornia", "ekosfer", "ekosistem", "ekotipe", "ekoturisme", "ekrin", "eks", "eksak", "eksaltasi",
	"eksamen", "eksaminasi", "eksantem", "eksantropus", "eksarasi", "eksegesis", "ekseget",
	"eksekusi", "eksekutor", "ekselen", "ekselensia", "eksentrik", "eksepsi", "ekses",
	"eksesif", "eksfoliasi", "ekshalasi", "ekshibisi", "ekshibisionisme", "ekshiber", "eksikator",
	"eksim", "eksipien", "eksisi", "eksistensi", "eksistensialis", "eksit", "ekskavasi", "ekskavator",
	"eksklusif", "eksklusivisme", "ekskomunikasi", "ekskresi", "ekskreta", "ekskursi",
	"ekspansi", "ekspansif", "ekspatriasi", "ekspedisi", "ekspeditor", "ekspektoran", "eksper",
	"eksperimen", "ekspirasi", "eksplanasi", "eksplisit", "eksploitasi", "eksplorasi", "eksploratif",
	"eksplosi", "eksplosif", "ekspo", "eksponen", "eksponensial", "ekspor", "eksportir",
	"ekspos", "ekspose", "eksposisi", "ekspresi", "ekspresif", "ekspresionis", "ekstase",
	"ekstasi", "ekstensi", "ekstensif", "ekstenstor", "eksterior", "ekstern", "eksternal",
	"ekstin", "ekstra", "ekstradisi", "ekstrak", "ekstrakardiak", "ekstraksi", "ekstrakurikuler",
	"ekstralinguistis", "ekstramarital", "ekstranei", "ekstraparlementer", "ekstrapolasi",
	"ekstraseluler", "ekstrateritorialitas", "ekstrem", "ekstremis", "ekstremitas", "ekstrinsik",
	"ekstrover", "ekstruksi", "eksudasi", "eksudat", "ektoblas", "ektoderm", "ektogenesis",
	"ektomikoriza", "ektohormon", "ektoparasit", "ektoplasma", "ekuatif", "ekuator", "ekuilibrium",
	"ekuinoks", "ekuitas", "ekumenis", "el", "ela", "elaborasi", "elak", "elan", "elang", "elastin",
	"elastis", "elastisitas", "elastomer", "elefantiasis", "elegan", "elegi", "elektret",
	"elektrifikasi", "elektrik", "elektris", "elektro", "elektrode", "elektrodinamika",
	"elektroensefalogram", "elektroforesis", "elektrokardiogram", "elektrokimia", "elektrolisis",
	"elektrolit", "elektromagnet", "elektromagnetik", "elektromekanik", "elektromotif",
	"elektron", "elektronik", "elektrosmosis", "elektrostatika", "elektroteknik", "elemen",
	"eliminasi", "elips", "elipsis", "elipsoid", "elipsometer", "elite", "elitisme", "elixir",
	"elok", "elu", "eluat", "elus", "em", "email", "emanasi", "emang", "emansipasi", "emas",
	"emaskulasi", "emat", "embacang", "embah", "embak", "embal", "embalau", "emban", "embar",
	"embara", "embarkasi", "embaru", "embas", "embat", "embek", "embel", "ember", "embih",
	"embik", "emblok", "embok", "embos", "embuh", "embun", "embung", "embus", "embut", "emendasi",
	"emeraldin", "emeritus", "emetik", "emfisema", "emigran", "emigrasi", "eminen",
	"emir", "emis", "emisi", "emitans", "emiten", "emoh", "emol", "emolumen", "emosi", "emosional",
	"emotif", "empal", "empang", "empas", "empat", "empedal", "empedu", "empek", "empela",
	"empelas", "empem", "emper", "emping", "empiri", "empiris", "empiritis", "empu", "empuk",
	"empul", "empulur", "empun", "emput", "emrat", "emu", "emulasi", "emulator", "emulsi",
	"en", "enak", "enam", "enamel", "enap", "enau", "encal", "encang", "encim", "encit",
	"encok", "encot", "endah", "endak", "endal", "endang", "endap", "endas", "endemi", "endemis",
	"endilau", "endoblast", "endoderma", "endodermis", "endofit", "endogami", "endogen",
	"endokarditis", "endokarp", "endokrin", "endokrinologi", "endolimfa", "endometriosis",
	"endomikoriza", "endoplasma", "endorfin", "endosfer", "endoskeleton", "endosperma",
	"endotel", "endoterm", "endrin", "enduk", "endul", "enduro", "endus", "enek", "eneng",
	"energetik", "energi", "energik", "enes", "enfitotik", "engan", "engas", "enggak", "enggan",
	"enggang", "enggar", "enggat", "enggil", "enggok", "engkah", "engkak", "engkang", "engkau",
	"engkek", "engket", "engkoh", "engkol", "engkong", "engku", "engkuk", "engsel", "enigma",
	"enjak", "enjal", "enjambemen", "enjelai", "enjin", "enjit", "enjut", "enologi", "enom",
	"ensambel", "ensefalitis", "ensefalon", "ensiform", "ensiklik", "ensiklopedia", "ensopor",
	"ental", "entah", "entak", "entas", "ente", "enten", "enteng", "entitas", "entoderm",
	"entok", "entong", "entot", "entozoa", "entri", "entusias", "enukleasi", "enul", "enuresis",
	"envak", "envoy", "enzim", "enzootik", "eolit", "eon", "eosen", "epak", "epal", "epang",
	"eparki", "epedemi", "epel", "ependima", "epifaring", "epifilum", "epifiotik", "epifisis",
	"epifit", "epifiton", "epifora", "epigastrium", "epigenesis", "epiglotis", "epigon",
	"epigraf", "epigrafi", "epigram", "epik", "epikotil", "epikuris", "epilepsi", "epileptik",
	"epilog", "epimisium", "epinasti", "epinefrina", "epinurim", "episenter", "episiotomi", "episkop",
	"episode", "episodik", "epistaksis", "epistel", "epistemologi", "epistola", "epitaf", "epitaksi",
	"epitel", "epitelioma", "epitermal", "epitet", "epizootik", "epok", "epoksi", "epoksin",
	"epolet", "eponim", "epos", "er", "eram", "erang", "erat", "erata", "erbis", "erbium",
	"ercis", "ereh", "erek", "ereng", "erepsin", "eret", "erg", "ergasiofit", "ergonomi",
	"ergonomis", "ergosterol", "ergot", "ergoterapi", "erian", "erik", "ering", "erisipelas",
	"eritema", "eritroblas", "eritrosit", "erong", "eror", "erosi", "erot", "erotik", "erotis",
	"erotisme", "erpah", "erpak", "erti", "eru", "erupsi", "es", "esa", "esai", "esais",
	"esak", "esek", "eselon", "esens", "esensi", "esensial", "eskatologi", "eskatologis",
	"esofagus", "esogna", "esot", "esoterik", "estafet", "estetik", "estetika", "estetikus",
	"estetis", "estimasi", "estriol", "estrogen", "estron", "estrus", "et", "eta", "etana",
	"etanol", "etape", "etatisme", "etek", "eter", "eteris", "eternit", "etik", "etika",
	"etiket", "etil", "etilena", "etimologi", "etimologis", "etnis", "etnografi", "etnografis",
	"etnolinguistik", "etnologi", "etnologis", "etnomusikologi", "etologi", "etos", "etsa",
	"eudaemonisme", "eufemisme", "eufemistis", "eufoni", "eufonium", "euforia", "eugenetika",
	"eugenika", "eukaliptol", "eukaliptus", "eukariota", "eukelato", "euploid", "eurihalin",
	"europium", "eustasia", "eutanasia", "eutektik", "eutenika", "eutrofikasi", "evakuasi",
	"evaluasi", "evangeli", "evangelis", "evaporasi", "evaporator", "evaporimeter", "evapotranspirasi",
	"evektif", "energi", "eversi", "eviden", "eviscerasi", "evokasi", "evokatif", "evolusi",
	"evolusioner", "faal", "faali", "fabel", "fabrikasi", "fabula", "faden", "fadil", "fadilat",
	"fagosit", "fagositosis", "fagot", "fahombe", "faidah", "fail", "fajar", "fakih", "fakir",
	"faks", "faksi", "faksimile", "fakta", "faktual", "faktor", "fakultas", "falaj", "falak",
	"falsafah", "falsafi", "famili", "familia", "familier", "familiisme", "fan", "fanatik",
	"fanatisme", "fana", "fanfare", "fang", "fani", "fantasi", "fantastis", "fantom", "farad",
	"faraid", "faraj", "farbion", "faring", "faringal", "faringalisasi", "farisi", "farji",
	"farmakodinamika", "farmakokinetika", "farmakologi", "farmakope", "farmasi", "farmasis",
	"farsial", "farsu", "fasakh", "fase", "faset", "fasia", "fasid", "fasih", "fasik",
	"fasilitas", "fasilitator", "fasis", "fasisme", "fastabikulkhairat", "fataal", "fatal",
	"fatala", "fatalis", "fatalisme", "fatalitas", "fatamorgana", "fathanah", "fatihah", "fatir",
	"fatom", "fatometer", "fatri", "fatsun", "fatur", "fatwa", "fauna", "favorit", "favoritisme",
	"febrin", "februari", "federal", "federalis", "federalisme", "federasi", "felinofilia",
	"felon", "femina", "feminin", "feminisme", "fenakit", "fengseng", "fenit", "fenol", "fenologi",
	"fenomena", "fenomenal", "fenomenalis", "fenotipe", "feodal", "feodalisme", "feral",
	"ferbium", "feri", "feritin", "fermion", "fermium", "feromon", "feronikel", "fertil",
	"fertilisasi", "fertilita", "ferum", "feses", "festival", "fetor", "fetus", "fi", "fiasko",
	"fiat", "fibra", "fibrik", "fibrilasi", "fibroblas", "fibrokistik", "fidah", "fider",
	"fidiah", "fidusia", "figur", "figuratif", "figuran", "fihir", "fikih", "fikli", "fikologi",
	"fikrah", "fiksasi", "fiksi", "fiktif", "filamen", "filantropi", "filantropis", "filaria",
	"filariasis", "filateli", "filatelik", "filem", "filial", "filibuster", "film", "filmis",
	"filo", "filodendron", "filogenesis", "filogeni", "filokakteus", "filologi", "filologis",
	"filopur", "filosofi", "filosofis", "filsafat", "filsuf", "filter", "filtrasi", "filtrat",
	"filum", "fimbria", "final", "finansial", "finir", "finish", "fiod", "fiologi", "firaj",
	"firasat", "firaun", "firdaus", "firdausi", "firkah", "firma", "firman", "firnas", "fisabilitas",
	"fisibel", "fisik", "fisika", "fisikawan", "fisiognomi", "fisiologi", "fisiologis", "fisioterapi",
	"fisostigmin", "fit", "fitnah", "fitofag", "fitogen", "fitogeografi", "fitokimia", "fitologi",
	"fitometer", "fiton", "fitopatologi", "fitoplankton", "fitosterol", "fitostrot", "fistul", "fjord",
	"flakon", "flamboyan", "flaminggo", "flanel", "flat", "flavonoid",
	"fleksibel", "fleksibilitas", "fleksi", "flensa", "fliker", "flirt", "floem", "flop", "flora",
	"floret", "flotasi", "flu", "fluensi", "fluida", "fluks", "fluktuasi", "fluor", "fluoresen",
	"fluorit", "fobia", "fokimeter", "fokstrot", "fokus", "folder", "foli", "folium", "fonasi",
	"fondasi", "fonem", "fonemik", "fonemis", "fonetik", "fonetis", "fonik", "fonologi", "fonologis",
	"fonon", "fonostilistika", "foramen", "foraminifera", "forensik", "forklif", "formal", "formalin",
	"formalisasi", "formalisme", "formalitas", "format", "formasi", "formula", "formulasi",
	"formulator", "fornikasi", "forte", "fortifikasi", "forum", "fosfat", "fosfina", "fosfor",
	"fosforus", "fosgen", "fosil", "foto", "fotodiode", "fotofosforilasi", "fotogalvanografi",
	"fotogenik", "fotografi", "fotografis", "fotografer", "fotokimia", "fotokonduksi", "fotokopi",
	"fotokrom", "fotokromik", "fotolisis", "fotometer", "fotometri", "fotomikgrafi", "fotomodel",
	"foton", "fotoperiodisme", "fotosel", "fotosfer", "fotosintesis", "fotostat", "fototaksis",
	"fototropi", "fototustel", "fovea", "fragmentasi", "fraksi", "fraksinasi", "fraktur",
	"frambusia", "frasa", "frase", "fraseologi", "frater", "fraternitas", "fregat", "frekuen",
	"frekuensi", "freon", "frib", "frikatif", "fron", "front", "frontal", "fruktosa", "frustrasi",
	"fuad", "fugasitas", "fujur", "fukaha", "fukara", "fuksina", "fuli", "fulminat", "fulus",
	"fumigan", "fumigasi", "fundamen", "fundamental", "fundamentalis", "fundus", "fungi",
	"fungibel", "fungisida", "fungsi", "fungsional", "fungsionaris", "fungus", "funiculus",
	"furfural", "furkan", "furnitur", "furqan", "furuk", "fusi", "fusta", "fusuk", "futur",
	"futurisme", "futuristik", "futuristis", "futurologi", "futurologis", "fyord",
}

func buildWordDictionary() map[rune][]string {
	dict := make(map[rune][]string)
	for _, word := range kbbiWords {
		if len(word) >= 3 {
			first := []rune(word[:1])[0]
			dict[first] = append(dict[first], word)
		}
	}
	return dict
}

func (s *wordChainService) CreateGame(userID string, opponentUsername string, vsBot bool, botDifficulty string) (*WordChainGameResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	firstWord := s.pickRandomWord()

	var game model.WordChainGame
	if vsBot {
		diff := botDifficulty
		if diff == "" {
			diff = "medium"
		}
		now := time.Now().Add(24 * time.Hour)
		game = model.WordChainGame{
			Player1ID:     uid,
			Player2ID:     nil,
			IsVsBot:       true,
			BotDifficulty: diff,
			CurrentWord:   firstWord,
			CurrentTurn:   &uid,
			WordsUsed:     []string{firstWord},
			Player1Score:  0,
			Player2Score:  0,
			Status:        "active",
			TurnExpiresAt: &now,
		}
	} else {
		var opponent model.User
		if err := database.DB.Where("username = ?", opponentUsername).First(&opponent).Error; err != nil {
			return nil, errors.New("Pengguna tidak ditemukan")
		}

		now := time.Now().Add(24 * time.Hour)
		game = model.WordChainGame{
			Player1ID:     uid,
			Player2ID:     &opponent.ID,
			IsVsBot:       false,
			CurrentWord:   firstWord,
			CurrentTurn:   &opponent.ID,
			WordsUsed:     []string{firstWord},
			Player1Score:  0,
			Player2Score:  0,
			Status:        "active",
			TurnExpiresAt: &now,
		}
	}

	if err := database.DB.Create(&game).Error; err != nil {
		return nil, err
	}

	return s.toResponse(&game, uid), nil
}

func (s *wordChainService) GetActiveGames(userID string) ([]WordChainGameResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var games []model.WordChainGame
	database.DB.Where("(player1_id = ? OR player2_id = ?) AND status = 'active'", uid, uid).
		Order("updated_at DESC").Find(&games)

	result := make([]WordChainGameResponse, len(games))
	for i, g := range games {
		result[i] = *s.toResponse(&g, uid)
	}
	return result, nil
}

func (s *wordChainService) GetGame(userID, gameID string) (*WordChainDetail, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	gid, err := uuid.Parse(gameID)
	if err != nil {
		return nil, errors.New("ID game tidak valid")
	}

	var game model.WordChainGame
	if err := database.DB.First(&game, "id = ?", gid).Error; err != nil {
		return nil, errors.New("Game tidak ditemukan")
	}

	resp := s.toResponse(&game, uid)
	detail := &WordChainDetail{
		WordChainGameResponse: *resp,
		WordsUsed:             game.WordsUsed,
		History:               []WordHistoryItem{},
	}
	return detail, nil
}

func (s *wordChainService) SubmitWord(userID, gameID, word string) (*WordSubmitResult, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	gid, err := uuid.Parse(gameID)
	if err != nil {
		return nil, errors.New("ID game tidak valid")
	}

	var game model.WordChainGame
	if err := database.DB.First(&game, "id = ?", gid).Error; err != nil {
		return nil, errors.New("Game tidak ditemukan")
	}

	if game.Status != "active" {
		return nil, errors.New("Game sudah selesai")
	}

	if game.CurrentTurn == nil || *game.CurrentTurn != uid {
		return nil, errors.New("Bukan giliranmu")
	}

	if game.TurnExpiresAt != nil && time.Now().After(*game.TurnExpiresAt) {
		game.Status = "finished"
		database.DB.Save(&game)
		return nil, errors.New("Waktu giliran sudah habis")
	}

	word = strings.ToLower(strings.TrimSpace(word))
	if len(word) < 3 {
		return &WordSubmitResult{Valid: false, Message: "Kata minimal 3 huruf"}, nil
	}

	lastRunes := []rune(game.CurrentWord)
	expectedFirst := lastRunes[len(lastRunes)-1]

	wordRunes := []rune(word)
	if wordRunes[0] != expectedFirst {
		return &WordSubmitResult{
			Valid: false, Message: fmt.Sprintf("Kata harus dimulai dengan huruf '%c'", expectedFirst),
		}, nil
	}

	for _, used := range game.WordsUsed {
		if used == word {
			return &WordSubmitResult{Valid: false, Message: "Kata sudah dipakai"}, nil
		}
	}

	if !s.isValidWord(word) {
		return &WordSubmitResult{Valid: false, Message: "Kata tidak ditemukan dalam kamus"}, nil
	}

	scoreDelta := 1
	if len(word) >= 7 {
		scoreDelta = 2
	}

	if game.Player1ID == uid {
		game.Player1Score += scoreDelta
	} else {
		game.Player2Score += scoreDelta
	}

	game.CurrentWord = word
	game.WordsUsed = append(game.WordsUsed, word)

	wordRune := []rune(word)
	nextLetter := wordRune[len(wordRune)-1]

	nextTurn := time.Now().Add(24 * time.Hour)
	game.TurnExpiresAt = &nextTurn

	result := &WordSubmitResult{
		Valid:      true,
		ScoreDelta: scoreDelta,
		NextLetter: string(nextLetter),
		GameOver:   false,
	}

	if game.IsVsBot {
		game.CurrentTurn = &game.Player1ID
		database.DB.Save(&game)

		botWord := s.getBotWord(nextLetter, game.WordsUsed, game.BotDifficulty)
		if botWord == "" {
			game.Status = "finished"
			winner := game.Player1ID
			result.GameOver = true
			result.WinnerID = winner.String()
			result.Message = "Bot tidak bisa menemukan kata. Kamu menang!"
		} else {
			botScore := 1
			if len(botWord) >= 7 {
				botScore = 2
			}
			game.Player2Score += botScore
			game.CurrentWord = botWord
			game.WordsUsed = append(game.WordsUsed, botWord)

			botWordRune := []rune(botWord)
			botNext := botWordRune[len(botWordRune)-1]
			result.BotResponse = botWord
			result.NextLetter = string(botNext)

			botNextTime := time.Now().Add(24 * time.Hour)
			game.TurnExpiresAt = &botNextTime

			err := s.wordExists(botWord)
			if err != nil {
				game.Status = "finished"
				winner := game.Player1ID
				result.GameOver = true
				result.WinnerID = winner.String()
				result.Message = "Bot memberikan kata tidak valid. Kamu menang!"
			}
		}
		database.DB.Save(&game)
	} else {
		if game.Player1ID == uid && game.Player2ID != nil {
			game.CurrentTurn = game.Player2ID
		} else if game.Player2ID != nil && *game.Player2ID == uid {
			game.CurrentTurn = &game.Player1ID
		}
		database.DB.Save(&game)

		if len(game.WordsUsed) >= 50 {
			game.Status = "finished"
			var winnerID uuid.UUID
			if game.Player1Score > game.Player2Score {
				winnerID = game.Player1ID
			} else {
				winnerID = *game.Player2ID
			}
			result.GameOver = true
			result.WinnerID = winnerID.String()
			result.Message = "Game selesai! Batas maksimum kata tercapai."
			database.DB.Save(&game)
		}
	}

	return result, nil
}

func (s *wordChainService) getBotWord(startLetter rune, usedWords []string, difficulty string) string {
	if s.cfg.AI.APIKey != "" {
		botWord, err := s.generateBotWord(startLetter, usedWords)
		if err == nil && botWord != "" {
			return botWord
		}
	}

	used := make(map[string]bool)
	for _, w := range usedWords {
		used[w] = true
	}

	candidates := s.words[startLetter]
	var filtered []string
	for _, w := range candidates {
		if !used[w] {
			filtered = append(filtered, w)
		}
	}

	if len(filtered) == 0 {
		return ""
	}

	switch difficulty {
	case "easy":
		return filtered[rand.Intn(len(filtered))]
	case "hard":
		maxLen := 0
		var longest []string
		for _, w := range filtered {
			if len(w) > maxLen {
				maxLen = len(w)
				longest = []string{w}
			} else if len(w) == maxLen {
				longest = append(longest, w)
			}
		}
		return longest[rand.Intn(len(longest))]
	default:
		mid := len(filtered) / 2
		return filtered[mid]
	}
}

func (s *wordChainService) generateBotWord(startLetter rune, usedWords []string) (string, error) {
	prompt := fmt.Sprintf(`Kamu adalah pemain game Sambung Kata Bahasa Indonesia.
Aturan:
- Balas dengan 1 kata bahasa Indonesia yang valid
- Kata harus dimulai dengan huruf: "%c"
- Kata minimal 3 huruf
- Tidak boleh menggunakan kata yang sudah dipakai: %s
- Hanya balas dengan kata saja, tanpa penjelasan
- Jika tidak ada kata yang memungkinkan, balas dengan "TIDAK_ADA"

Huruf awal yang harus kamu pakai: "%c"`, startLetter, strings.Join(usedWords, ", "), startLetter)

	body := map[string]interface{}{
		"model":       s.cfg.AI.Model,
		"max_tokens":  50,
		"temperature": 0.3,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	bodyBytes, _ := json.Marshal(body)

	baseURL := s.cfg.AI.BaseURL
	if baseURL == "" {
		baseURL = "https://openrouter.ai/api/v1"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/chat/completions", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.cfg.AI.APIKey)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &apiResp); err != nil || len(apiResp.Choices) == 0 {
		return "", fmt.Errorf("invalid AI response")
	}

	botWord := strings.TrimSpace(strings.ToLower(apiResp.Choices[0].Message.Content))
	if botWord == "tidak_ada" {
		return "", fmt.Errorf("no word available")
	}

	for _, used := range usedWords {
		if used == botWord {
			return "", fmt.Errorf("word already used")
		}
	}

	return botWord, nil
}

func (s *wordChainService) isValidWord(word string) bool {
	wordRunes := []rune(word)
	if len(wordRunes) < 3 {
		return false
	}

	first := wordRunes[0]
	candidates := s.words[first]
	for _, w := range candidates {
		if w == word {
			return true
		}
	}
	return false
}

func (s *wordChainService) wordExists(word string) error {
	if !s.isValidWord(word) {
		return fmt.Errorf("word not found: %s", word)
	}
	return nil
}

func (s *wordChainService) pickRandomWord() string {
	letters := []rune{}
	for k := range s.words {
		letters = append(letters, k)
	}
	for i := 0; i < 10; i++ {
		l := letters[rand.Intn(len(letters))]
		words := s.words[l]
		if len(words) > 0 {
			return words[rand.Intn(len(words))]
		}
	}
	return "buku"
}

func (s *wordChainService) toResponse(game *model.WordChainGame, userID uuid.UUID) *WordChainGameResponse {
	resp := &WordChainGameResponse{
		ID:            game.ID.String(),
		IsVsBot:       game.IsVsBot,
		BotDifficulty: game.BotDifficulty,
		CurrentWord:   game.CurrentWord,
		Player1Score:  game.Player1Score,
		Player2Score:  game.Player2Score,
		Status:        game.Status,
		CreatedAt:     game.CreatedAt.Format(time.RFC3339),
	}

	if game.TurnExpiresAt != nil {
		resp.TurnExpiresAt = game.TurnExpiresAt.Format(time.RFC3339)
	}

	if game.CurrentTurn != nil {
		resp.MyTurn = *game.CurrentTurn == userID
	}

	if game.IsVsBot {
		resp.OpponentName = s.botName(game.BotDifficulty)
	} else {
		if game.Player1ID == userID && game.Player2ID != nil {
			var u model.User
			if err := database.DB.First(&u, "id = ?", *game.Player2ID).Error; err == nil {
				resp.OpponentName = u.Username
			}
		} else {
			var u model.User
			if err := database.DB.First(&u, "id = ?", game.Player1ID).Error; err == nil {
				resp.OpponentName = u.Username
			}
		}
	}

	return resp
}

func (s *wordChainService) botName(difficulty string) string {
	names := map[string][]string{
		"easy":   {"Rudi Bot", "Siti Bot", "Bimo Bot", "Ayu Bot", "Dani Bot"},
		"medium": {"Alex Bot", "Maya Bot", "Rio Bot", "Nisa Bot", "Bagas Bot"},
		"hard":   {"Cipher", "Nexus", "Titan", "Vega", "Zeta"},
		"expert": {"MAESTRO", "OMEGA", "APEX"},
	}
	pool := names[difficulty]
	if len(pool) == 0 {
		pool = names["medium"]
	}
	return pool[rand.Intn(len(pool))]
}
