package ws

import (
	"log"
	"math/rand"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type RoomManager struct {
	rooms           sync.Map
	reconnectTimers sync.Map
}

func (rm *RoomManager) StartCleanup(interval time.Duration) {
	go func() {
		for {
			time.Sleep(interval)
			rm.rooms.Range(func(key, value interface{}) bool {
				room := value.(*GameRoom)
				room.mu.Lock()
				if room.State == "waiting" && time.Since(room.CreatedAt) > 5*time.Minute {
					rm.rooms.Delete(key)
					log.Printf("room cleanup: deleted stale room %s", key)
				} else if room.State == "finished" && room.FinishedAt != nil && time.Since(*room.FinishedAt) > 5*time.Minute {
					rm.rooms.Delete(key)
					log.Printf("room cleanup: deleted finished room %s", key)
				}
				room.mu.Unlock()
				return true
			})
		}
	}()
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
		ID:         roomID,
		GameType:   gameType,
		GameID:     gameID,
		Settings:   settings,
		State:      "waiting",
		Players:    make(map[string]*Player),
		Spectators: make(map[string]*Client),
		Questions:  make([]QuestionPayload, 0),
		CreatedAt:  time.Now(),
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

	if existing, ok := room.Players[userID]; ok {
		existing.Username = username
		existing.Level = level
		if existing.AnsweredQuestions == nil {
			existing.AnsweredQuestions = make(map[string]bool)
		}
		if room.ClientMap == nil {
			room.ClientMap = make(map[string]*Client)
		}
		return existing
	}

	player := &Player{
		ID:                userID,
		Username:          username,
		Level:             level,
		Score:             0,
		Correct:           0,
		Wrong:             0,
		JoinedAt:          time.Now(),
		Client:            nil,
		AnsweredQuestions: make(map[string]bool),
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

func (rm *RoomManager) StartReconnectTimer(roomID, userID string, timeout time.Duration, hub *Hub) {
	timerKey := roomID + ":" + userID
	timerStartedAt := time.Now()
	rm.reconnectTimers.Store(timerKey, timerStartedAt)

	go func() {
		time.Sleep(timeout)

		value, ok := rm.reconnectTimers.Load(timerKey)
		if !ok || value != timerStartedAt {
			return
		}
		rm.reconnectTimers.Delete(timerKey)

		room, ok := rm.Get(roomID)
		if !ok {
			return
		}

		room.mu.Lock()
		player, exists := room.Players[userID]
		if !exists {
			room.mu.Unlock()
			return
		}

		remaining := len(room.Players) - 1

		log.Printf("reconnect timeout: %s left room %s (remaining: %d)", userID, roomID, remaining)

		if remaining > 0 && room.State == "playing" {
			player.Client = nil
			player.Forfeited = true
			room.State = "finished"
			room.FinishedAt = nowPtr()
			room.mu.Unlock()
			room.BroadcastExcept(userID, "player_forfeited", map[string]string{
				"player_id": userID,
			})
			return
		}

		delete(room.Players, userID)
		room.mu.Unlock()

		if remaining == 0 {
			rm.rooms.Delete(roomID)
		}
	}()
}

func (rm *RoomManager) CancelReconnectTimer(roomID, userID string) {
	timerKey := roomID + ":" + userID
	rm.reconnectTimers.Delete(timerKey)
}

type Player struct {
	ID                string
	Username          string
	Level             int
	Score             int
	Correct           int
	Wrong             int
	JoinedAt          time.Time
	Client            *Client
	AnsweredQuestions map[string]bool
	Forfeited         bool
}

type GameRoom struct {
	ID                  string
	GameType            string
	GameID              string
	Players             map[string]*Player
	ClientMap           map[string]*Client
	Spectators          map[string]*Client
	Bots                map[string]*RuleBasedBot
	Bot                 *RuleBasedBot
	State               string
	Questions           []QuestionPayload
	CurrentQ            int
	Settings            RoomSettings
	CreatedAt           time.Time
	StartedAt           *time.Time
	FinishedAt          *time.Time
	GameData            map[string]interface{}
	SuddenDeathActive   bool
	SuddenDeathWinnerID string
	mu                  sync.RWMutex
	questionCh          chan QuestionPayload
	done                chan struct{}
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

func (r *GameRoom) HasPlayer(userID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, ok := r.Players[userID]
	return ok
}

func (r *GameRoom) CurrentStatePayload() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	players := make([]PlayerInfo, 0, len(r.Players))
	for _, p := range r.Players {
		players = append(players, PlayerInfo{
			ID:       p.ID,
			Username: p.Username,
			Level:    p.Level,
			Score:    p.Score,
		})
	}

	payload := map[string]interface{}{
		"room_id":   r.ID,
		"state":     r.State,
		"players":   players,
		"current_q": r.CurrentQ,
	}
	if r.State == "playing" && r.CurrentQ >= 0 && r.CurrentQ < len(r.Questions) {
		payload["current_question"] = r.Questions[r.CurrentQ]
	}
	return payload
}

func (r *GameRoom) Broadcast(msgType string, payload interface{}) {
	for _, p := range r.Players {
		if p.Client != nil {
			p.Client.SendMessage(msgType, payload)
		}
	}
	for _, client := range r.Spectators {
		if client != nil {
			client.SendMessage(msgType, payload)
		}
	}
}

func (r *GameRoom) BroadcastExcept(userID string, msgType string, payload interface{}) {
	for _, p := range r.Players {
		if p.ID != userID && p.Client != nil {
			p.Client.SendMessage(msgType, payload)
		}
	}
	for spectatorID, client := range r.Spectators {
		if spectatorID != userID && client != nil {
			client.SendMessage(msgType, payload)
		}
	}
}

func (r *GameRoom) AddBot() *RuleBasedBot {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.Players) >= r.Settings.MaxPlayers {
		return nil
	}

	bot := NewRuleBasedBot(r.Settings.Difficulty, r.GameType)
	r.Bot = bot
	if r.Bots == nil {
		r.Bots = make(map[string]*RuleBasedBot)
	}
	r.Bots[bot.UserID] = bot

	r.Players[bot.UserID] = &Player{
		ID:                bot.UserID,
		Username:          bot.DisplayName,
		Level:             1,
		Score:             0,
		Correct:           0,
		Wrong:             0,
		JoinedAt:          time.Now(),
		AnsweredQuestions: make(map[string]bool),
	}
	return bot
}

func (r *GameRoom) FillBotsUntilFull() []*RuleBasedBot {
	bots := make([]*RuleBasedBot, 0)
	for {
		bot := r.AddBot()
		if bot == nil {
			return bots
		}
		bots = append(bots, bot)
	}
}

func (r *GameRoom) RemoveOneBot() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for botID := range r.Bots {
		delete(r.Bots, botID)
		delete(r.Players, botID)
		if r.Bot != nil && r.Bot.UserID == botID {
			r.Bot = nil
			for _, bot := range r.Bots {
				r.Bot = bot
				break
			}
		}
		return true
	}
	return false
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

	r.runBotPlayers(hub)

	for i, q := range questions {
		r.mu.Lock()
		if r.State != "playing" {
			r.mu.Unlock()
			break
		}
		r.CurrentQ = i
		r.mu.Unlock()

		r.Broadcast("question", q)
		timer := r.Settings.Timer
		if timer <= 0 {
			timer = 10
		}
		time.Sleep(time.Duration(timer) * time.Second)
	}

	if r.needsSuddenDeath() {
		r.runSuddenDeath()
	}

	r.mu.Lock()
	if r.State != "finished" {
		r.State = "finished"
		r.FinishedAt = nowPtr()
	}
	r.mu.Unlock()
	close(r.done)

	results := r.calculateResults()
	winnerID := r.getWinnerID(results)
	r.Broadcast("game_over", GameOverPayload{
		Results:  results,
		WinnerID: winnerID,
		XPEarned: r.calculateXP(results),
	})

	if winnerID != "" {
		r.persistFinishedMatch(results, winnerID)
		if !strings.HasPrefix(winnerID, "bot_") {
			hub.checkAchievements(winnerID)
		}
	}
}

func (r *GameRoom) runBotPlayers(hub *Hub) {
	if len(r.Bots) == 0 {
		return
	}
	for _, bot := range r.Bots {
		go r.runBotPlayer(bot)
	}
}

func (r *GameRoom) runBotPlayer(bot *RuleBasedBot) {
	for i := range r.Questions {
		q := r.Questions[i]

		select {
		case <-r.done:
			return
		default:
		}

		delay := bot.GetDelay()
		time.Sleep(delay)

		answer := bot.AnswerQuestion(q)
		r.SubmitAnswer(bot.UserID, q.ID, answer.Answer, int(delay.Milliseconds()))
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

	if r.CurrentQ < 0 || r.CurrentQ >= len(r.Questions) || r.Questions[r.CurrentQ].ID != questionID {
		return
	}

	if player.AnsweredQuestions == nil {
		player.AnsweredQuestions = make(map[string]bool)
	}
	if player.AnsweredQuestions[questionID] {
		return
	}

	q := r.findQuestion(questionID)
	if q == nil {
		return
	}
	player.AnsweredQuestions[questionID] = true

	isCorrect := answer == r.getCorrectAnswer(q.ID)
	scoreDelta := 0
	if isCorrect {
		scoreDelta = 10
		if timeTaken < 3000 {
			scoreDelta += 5
		}
		if r.SuddenDeathActive && r.SuddenDeathWinnerID == "" {
			scoreDelta += 100
			r.SuddenDeathWinnerID = userID
			r.State = "finished"
			r.FinishedAt = nowPtr()
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
	for _, q := range r.Questions {
		if q.ID == questionID {
			return q.CorrectAnswer
		}
	}
	return ""
}

func (r *GameRoom) generateQuestions(cfg *config.Config) []QuestionPayload {
	difficulty := r.Settings.Difficulty
	totalQ := r.Settings.Questions
	if totalQ <= 0 {
		totalQ = 15
	}
	questions := make([]QuestionPayload, totalQ)

	for i := 0; i < totalQ; i++ {
		questions[i] = r.generateQuestionPayload(difficulty, i+1, totalQ)
	}

	return questions
}

func (r *GameRoom) generateQuestionPayload(difficulty string, questionNumber, total int) QuestionPayload {
	a, b := r.generateNumbers(difficulty)
	op := r.pickOperator(difficulty)
	correct := r.calculate(a, b, op)

	q := QuestionPayload{
		ID:             uuid.New().String(),
		Text:           r.buildQuestion(a, b, op),
		QuestionNumber: questionNumber,
		Total:          total,
		CorrectAnswer:  itoa(correct),
	}
	q.Options = r.generateOptions(correct)
	return q
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
	r.mu.RLock()
	defer r.mu.RUnlock()

	var results []PlayerResult
	for _, p := range r.Players {
		results = append(results, PlayerResult{
			PlayerID: p.ID,
			Username: p.Username,
			Score:    p.Score,
			Correct:  p.Correct,
			Wrong:    p.Wrong,
			IsWinner: !p.Forfeited,
		})
	}

	hasForfeit := false
	for _, p := range r.Players {
		if p.Forfeited {
			hasForfeit = true
			break
		}
	}
	if r.SuddenDeathWinnerID != "" {
		for i := range results {
			results[i].IsWinner = results[i].PlayerID == r.SuddenDeathWinnerID
		}
		sort.SliceStable(results, func(i, j int) bool {
			if results[i].IsWinner != results[j].IsWinner {
				return results[i].IsWinner
			}
			return results[i].Score > results[j].Score
		})
		return results
	}
	if !hasForfeit && len(results) > 0 {
		top := 0
		for i := range results {
			results[i].IsWinner = false
			if results[i].Score > results[top].Score {
				top = i
			}
		}
		results[top].IsWinner = true
	}

	sort.SliceStable(results, func(i, j int) bool {
		if results[i].IsWinner != results[j].IsWinner {
			return results[i].IsWinner
		}
		return results[i].Score > results[j].Score
	})
	return results
}

func (r *GameRoom) needsSuddenDeath() bool {
	if !strings.HasPrefix(r.ID, "tournament:") {
		return false
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.SuddenDeathWinnerID != "" || len(r.Players) < 2 {
		return false
	}

	hasForfeit := false
	topScore := 0
	topCount := 0
	first := true
	for _, player := range r.Players {
		if player.Forfeited {
			hasForfeit = true
			break
		}
		if first || player.Score > topScore {
			topScore = player.Score
			topCount = 1
			first = false
			continue
		}
		if player.Score == topScore {
			topCount++
		}
	}
	return !hasForfeit && topCount > 1
}

func (r *GameRoom) runSuddenDeath() {
	timer := r.Settings.Timer
	if timer < 10 {
		timer = 10
	}
	difficulty := r.Settings.Difficulty
	if difficulty == "" {
		difficulty = "medium"
	}

	r.mu.Lock()
	if r.State == "finished" || r.SuddenDeathWinnerID != "" {
		r.mu.Unlock()
		return
	}
	r.SuddenDeathActive = true
	baseQuestion := len(r.Questions)
	r.mu.Unlock()

	r.Broadcast("sudden_death_start", map[string]interface{}{
		"message": "Skor seri. Sudden death dimulai.",
		"timer":   timer,
	})

	for i := 1; i <= 10; i++ {
		r.mu.Lock()
		if r.State == "finished" || r.SuddenDeathWinnerID != "" {
			r.mu.Unlock()
			break
		}
		q := r.generateQuestionPayload(difficulty, baseQuestion+i, baseQuestion+i)
		r.Questions = append(r.Questions, q)
		r.CurrentQ = len(r.Questions) - 1
		r.mu.Unlock()

		r.Broadcast("question", q)
		r.runBotSuddenDeathQuestion(q)

		deadline := time.Now().Add(time.Duration(timer) * time.Second)
		for time.Now().Before(deadline) {
			r.mu.RLock()
			done := r.State == "finished" || r.SuddenDeathWinnerID != ""
			r.mu.RUnlock()
			if done {
				return
			}
			time.Sleep(100 * time.Millisecond)
		}
	}

	r.mu.Lock()
	if r.SuddenDeathWinnerID == "" {
		r.SuddenDeathWinnerID = r.topPlayerIDLocked()
	}
	r.State = "finished"
	r.FinishedAt = nowPtr()
	r.mu.Unlock()

}

func (r *GameRoom) runBotSuddenDeathQuestion(q QuestionPayload) {
	for _, bot := range r.Bots {
		go func(bot *RuleBasedBot) {
			delay := bot.GetDelay()
			time.Sleep(delay)
			answer := bot.AnswerQuestion(q)
			r.SubmitAnswer(bot.UserID, q.ID, answer.Answer, int(delay.Milliseconds()))
		}(bot)
	}
}

func (r *GameRoom) topPlayerIDLocked() string {
	topID := ""
	topScore := 0
	first := true
	for _, player := range r.Players {
		if first || player.Score > topScore {
			topID = player.ID
			topScore = player.Score
			first = false
		}
	}
	return topID
}

func (r *GameRoom) getWinnerID(results []PlayerResult) string {
	if len(results) == 0 {
		return ""
	}
	winner := results[0]
	for _, res := range results[1:] {
		if res.IsWinner && !winner.IsWinner {
			winner = res
			continue
		}
		if res.IsWinner == winner.IsWinner && res.Score > winner.Score {
			winner = res
		}
	}
	return winner.PlayerID
}

func (r *GameRoom) calculateXP(results []PlayerResult) int {
	return 50
}

func (r *GameRoom) persistFinishedMatch(results []PlayerResult, winnerID string) {
	gameID, err := uuid.Parse(r.GameID)
	if err != nil {
		log.Printf("match persist skipped: invalid game id %q: %v", r.GameID, err)
		return
	}

	matchType := "quickmatch"
	if r.hasBotParticipant(results) {
		matchType = "bot"
	}

	var winnerUUID *uuid.UUID
	if parsedWinnerID, err := uuid.Parse(winnerID); err == nil {
		winnerUUID = &parsedWinnerID
	}

	match := model.MultiplayerMatch{
		GameID:     gameID,
		MatchType:  matchType,
		Difficulty: r.Settings.Difficulty,
		Status:     "finished",
		WinnerID:   winnerUUID,
		StartedAt:  r.StartedAt,
		FinishedAt: r.FinishedAt,
		CreatedAt:  time.Now(),
	}
	if err := database.DB.Create(&match).Error; err != nil {
		log.Printf("match persist failed: %v", err)
		return
	}

	participants := make([]model.MatchParticipant, 0, len(results))
	for rank, result := range results {
		participant := model.MatchParticipant{
			MatchID:        match.ID,
			Score:          result.Score,
			CorrectAnswers: result.Correct,
			WrongAnswers:   result.Wrong,
			Rank:           rank + 1,
			IsWinner:       result.IsWinner,
			JoinedAt:       time.Now(),
			FinishedAt:     r.FinishedAt,
		}
		if result.IsWinner {
			participant.XPEarned = r.calculateXP(results)
		} else {
			participant.XPEarned = 25
		}

		if userID, err := uuid.Parse(result.PlayerID); err == nil {
			participant.UserID = &userID
		} else if strings.HasPrefix(result.PlayerID, "bot_") {
			participant.BotType = "rule_based"
			participant.BotDifficulty = r.Settings.Difficulty
			participant.BotName = result.Username
		}

		participants = append(participants, participant)
	}

	if len(participants) > 0 {
		if err := database.DB.Create(&participants).Error; err != nil {
			log.Printf("match participants persist failed: %v", err)
		}
	}
}

func (r *GameRoom) hasBotParticipant(results []PlayerResult) bool {
	for _, result := range results {
		if strings.HasPrefix(result.PlayerID, "bot_") {
			return true
		}
	}
	return false
}

func nowPtr() *time.Time {
	t := time.Now()
	return &t
}
