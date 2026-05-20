package ws

import (
	"encoding/json"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/google/uuid"
)

type RoomManager struct {
	rooms sync.Map
}

func NewRoomManager() *RoomManager {
	return &RoomManager{}
}

func (rm *RoomManager) Get(roomID string) (*GameRoom, bool) {
	v, ok := rm.rooms.Load(roomID)
	if !ok {
		return nil, false
	}
	return v.(*GameRoom), true
}

func (rm *RoomManager) CreateRoom(roomID, gameType string, settings RoomSettings, gameID string) *GameRoom {
	room := &GameRoom{
		ID:        roomID,
		GameType:  gameType,
		GameID:    gameID,
		Settings:  settings,
		State:     "waiting",
		Players:   make(map[string]*Player),
		Questions: make([]QuestionPayload, 0),
		CreatedAt: time.Now(),
	}
	rm.rooms.Store(roomID, room)
	return room
}

func (rm *RoomManager) JoinRoom(roomID, userID, username string, level int) *Player {
	v, ok := rm.rooms.Load(roomID)
	if !ok {
		return nil
	}
	room := v.(*GameRoom)
	room.mu.Lock()
	defer room.mu.Unlock()

	player := &Player{
		ID:       userID,
		Username: username,
		Level:    level,
		Score:    0,
		Correct:  0,
		Wrong:    0,
		JoinedAt: time.Now(),
		Client:   nil,
	}
	if room.ClientMap == nil {
		room.ClientMap = make(map[string]*Client)
	}
	room.Players[userID] = player
	return player
}

func (rm *RoomManager) LeaveRoom(roomID, userID string) {
	v, ok := rm.rooms.Load(roomID)
	if !ok {
		return
	}
	room := v.(*GameRoom)
	room.mu.Lock()
	defer room.mu.Unlock()

	delete(room.Players, userID)
	delete(room.ClientMap, userID)

	if len(room.Players) == 0 {
		rm.rooms.Delete(roomID)
		log.Printf("room deleted: %s", roomID)
	}
}

type Player struct {
	ID       string
	Username string
	Level    int
	Score    int
	Correct  int
	Wrong    int
	JoinedAt time.Time
	Client   *Client
}

type GameRoom struct {
	ID         string
	GameType   string
	GameID     string
	Players    map[string]*Player
	ClientMap  map[string]*Client
	Bots       map[string]*RuleBasedBot
	Bot        *RuleBasedBot
	State      string
	Questions  []QuestionPayload
	CurrentQ   int
	Settings   RoomSettings
	CreatedAt  time.Time
	StartedAt  *time.Time
	FinishedAt *time.Time
	mu         sync.RWMutex
	questionCh chan QuestionPayload
	done       chan struct{}
}

func (r *GameRoom) IsFull() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Players) >= r.Settings.MaxPlayers
}

func (r *GameRoom) GetPlayers() []PlayerInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []PlayerInfo
	for _, p := range r.Players {
		result = append(result, PlayerInfo{
			ID:       p.ID,
			Username: p.Username,
			Level:    p.Level,
			Score:    p.Score,
		})
	}
	return result
}

func (r *GameRoom) Broadcast(msgType string, payload interface{}) {
	data, _ := json.Marshal(map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	})
	for _, p := range r.Players {
		if p.Client != nil {
			select {
			case p.Client.Send <- data:
			default:
			}
		}
	}
}

func (r *GameRoom) BroadcastExcept(userID string, msgType string, payload interface{}) {
	data, _ := json.Marshal(map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	})
	for _, p := range r.Players {
		if p.ID != userID && p.Client != nil {
			select {
			case p.Client.Send <- data:
			default:
			}
		}
	}
}

func (r *GameRoom) AddBot() {
	r.mu.Lock()
	defer r.mu.Unlock()

	bot := NewRuleBasedBot(r.Settings.Difficulty, r.GameType)
	r.Bot = bot
	if r.Bots == nil {
		r.Bots = make(map[string]*RuleBasedBot)
	}
	r.Bots[bot.UserID] = bot

	r.Players[bot.UserID] = &Player{
		ID:       bot.UserID,
		Username: bot.DisplayName,
		Level:    1,
		Score:    0,
		Correct:  0,
		Wrong:    0,
		JoinedAt: time.Now(),
	}
}

func (r *GameRoom) StartGame(hub *Hub, cfg *config.Config) {
	r.mu.Lock()
	if r.State != "waiting" {
		r.mu.Unlock()
		return
	}
	r.State = "countdown"
	r.mu.Unlock()

	r.Broadcast("game_starting", map[string]int{"countdown": 3})
	time.Sleep(3 * time.Second)

	r.mu.Lock()
	r.State = "playing"
	r.StartedAt = nowPtr()
	r.mu.Unlock()

	questions := r.generateQuestions(cfg)
	r.mu.Lock()
	r.Questions = questions
	r.CurrentQ = 0
	r.mu.Unlock()

	r.questionCh = make(chan QuestionPayload)
	r.done = make(chan struct{})

	go r.runBotPlayer(hub)

	for i, q := range questions {
		r.mu.Lock()
		r.CurrentQ = i
		r.mu.Unlock()

		r.Broadcast("question", q)
		time.Sleep(10 * time.Second)
	}

	r.mu.Lock()
	r.State = "finished"
	r.FinishedAt = nowPtr()
	r.mu.Unlock()
	close(r.done)

	results := r.calculateResults()
	r.Broadcast("game_over", GameOverPayload{
		Results:  results,
		WinnerID: r.getWinnerID(results),
		XPEarned: r.calculateXP(results),
	})
}

func (r *GameRoom) runBotPlayer(hub *Hub) {
	if r.Bot == nil {
		return
	}
	for {
		select {
		case q, ok := <-r.questionCh:
			if !ok {
				return
			}
			r.mu.Lock()
			bot := r.Bot
			r.mu.Unlock()
			if bot == nil {
				return
			}
			time.Sleep(bot.GetDelay())
			answer := bot.AnswerQuestion(q)
			r.SubmitAnswer(bot.UserID, q.ID, answer.Answer, int(answer.TimeTaken.Milliseconds()))
		case <-r.done:
			return
		}
	}
}

func (r *GameRoom) SubmitAnswer(userID, questionID, answer string, timeTaken int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.State != "playing" {
		return
	}

	player, ok := r.Players[userID]
	if !ok {
		return
	}

	if timeTaken < 200 {
		return
	}

	q := r.findQuestion(questionID)
	if q == nil {
		return
	}

	isCorrect := answer == r.getCorrectAnswer(q.ID)
	scoreDelta := 0
	if isCorrect {
		scoreDelta = 10
		if timeTaken < 3000 {
			scoreDelta += 5
		}
		player.Score += scoreDelta
		player.Correct++
	} else {
		scoreDelta = -3
		player.Score += scoreDelta
		player.Wrong++
	}

	r.Broadcast("answer_result", AnswerResultPayload{
		PlayerID:   userID,
		IsCorrect:  isCorrect,
		ScoreDelta: scoreDelta,
		NewScore:   player.Score,
	})

	r.Broadcast("opponent_progress", OpponentProgressPayload{
		PlayerID:          userID,
		QuestionsAnswered: player.Correct + player.Wrong,
		CurrentScore:      player.Score,
	})
}

func (r *GameRoom) findQuestion(id string) *QuestionPayload {
	for i := range r.Questions {
		if r.Questions[i].ID == id {
			return &r.Questions[i]
		}
	}
	return nil
}

func (r *GameRoom) getCorrectAnswer(questionID string) string {
	return ""
}

func (r *GameRoom) generateQuestions(cfg *config.Config) []QuestionPayload {
	difficulty := r.Settings.Difficulty
	totalQ := 15
	questions := make([]QuestionPayload, totalQ)

	for i := 0; i < totalQ; i++ {
		a, b := r.generateNumbers(difficulty)
		op := r.pickOperator(difficulty)
		correct := r.calculate(a, b, op)

		q := QuestionPayload{
			ID:             uuid.New().String(),
			Text:           r.buildQuestion(a, b, op),
			QuestionNumber: i + 1,
			Total:          totalQ,
		}

		options := r.generateOptions(correct)
		q.Options = options
		questions[i] = q
	}

	return questions
}

func (r *GameRoom) generateNumbers(diff string) (int, int) {
	switch diff {
	case "easy":
		return rand.Intn(10) + 1, rand.Intn(10) + 1
	case "medium":
		return rand.Intn(50) + 1, rand.Intn(50) + 1
	case "hard":
		return rand.Intn(100) + 1, rand.Intn(100) + 1
	default:
		return rand.Intn(20) + 1, rand.Intn(20) + 1
	}
}

func (r *GameRoom) pickOperator(diff string) string {
	ops := []string{"+", "-", "*", "/"}
	switch diff {
	case "easy":
		ops = []string{"+", "-", "*"}
	case "medium":
		ops = []string{"+", "-", "*", "/"}
	case "hard":
		ops = []string{"+", "-", "*", "/"}
	}
	return ops[rand.Intn(len(ops))]
}

func (r *GameRoom) calculate(a, b int, op string) int {
	switch op {
	case "+":
		return a + b
	case "-":
		return a - b
	case "*":
		return a * b
	case "/":
		if b == 0 {
			b = 1
		}
		return a / b
	}
	return 0
}

func (r *GameRoom) buildQuestion(a, b int, op string) string {
	return r.renderOp(a, b, op)
}

func (r *GameRoom) renderOp(a, b int, op string) string {
	symbol := op
	switch op {
	case "*":
		symbol = "×"
	case "/":
		symbol = "÷"
	}
	return r.formatNumber(a) + " " + symbol + " " + r.formatNumber(b) + " = ?"
}

func (r *GameRoom) formatNumber(n int) string {
	return itoa(n)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	digits := []byte{}
	neg := false
	if n < 0 {
		neg = true
		n = -n
	}
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	if neg {
		return "-" + string(digits)
	}
	return string(digits)
}

func (r *GameRoom) generateOptions(correct int) []string {
	opts := []string{itoa(correct)}
	used := map[int]bool{correct: true}

	for len(opts) < 4 {
		offset := rand.Intn(21) - 10
		if offset == 0 {
			offset = rand.Intn(5) + 1
		}
		val := correct + offset
		if !used[val] && val >= 0 {
			used[val] = true
			opts = append(opts, itoa(val))
		}
	}

	rand.Shuffle(len(opts), func(i, j int) {
		opts[i], opts[j] = opts[j], opts[i]
	})
	return opts
}

func (r *GameRoom) calculateResults() []PlayerResult {
	var results []PlayerResult
	for _, p := range r.Players {
		results = append(results, PlayerResult{
			PlayerID: p.ID,
			Username: p.Username,
			Score:    p.Score,
			Correct:  p.Correct,
			Wrong:    p.Wrong,
		})
	}
	return results
}

func (r *GameRoom) getWinnerID(results []PlayerResult) string {
	if len(results) == 0 {
		return ""
	}
	winner := results[0]
	for _, res := range results[1:] {
		if res.Score > winner.Score {
			winner = res
		}
	}
	return winner.PlayerID
}

func (r *GameRoom) calculateXP(results []PlayerResult) int {
	return 50
}

func nowPtr() *time.Time {
	t := time.Now()
	return &t
}
