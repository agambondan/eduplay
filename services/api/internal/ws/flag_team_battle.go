package ws

import (
	"math/rand"
	"sort"
	"strings"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

const flagTeamTotalRounds = 10

var aseanFlagCodes = map[string]bool{
	"bn": true, "kh": true, "id": true, "la": true, "my": true,
	"mm": true, "ph": true, "sg": true, "th": true, "vn": true,
}

var hardFlagCodes = map[string]bool{
	"ad": true, "ae": true, "at": true, "au": true, "be": true, "bg": true,
	"ci": true, "cm": true, "co": true, "dk": true, "ec": true, "fi": true,
	"gn": true, "hu": true, "id": true, "ie": true, "in": true, "it": true,
	"jo": true, "lu": true, "mc": true, "ml": true, "ne": true, "nl": true,
	"no": true, "nz": true, "pl": true, "ro": true, "se": true, "td": true,
	"ye": true,
}

type flagCountry struct {
	Name     string
	FlagCode string
	Region   string
}

type flagTeamState struct {
	Teams       map[string]string
	TeamScores  map[string]int
	TeamStreaks map[string]int
	Answered    map[string]bool
	Resolved    bool
}

type flagAnswerEvent struct {
	PlayerID      string         `json:"player_id"`
	Username      string         `json:"username"`
	Team          string         `json:"team"`
	IsCorrect     bool           `json:"is_correct"`
	ScoreDelta    int            `json:"score_delta"`
	TeamScore     int            `json:"team_score"`
	TeamScores    map[string]int `json:"team_scores"`
	CorrectAnswer string         `json:"correct_answer,omitempty"`
	Resolved      bool           `json:"resolved"`
	Message       string         `json:"message"`
}

func (h *Hub) scheduleFlagTeamStart(roomID string) {
	room, ok := h.Rooms.Get(roomID)
	if !ok {
		return
	}

	room.mu.Lock()
	if room.GameData == nil {
		room.GameData = map[string]interface{}{}
	}
	if room.State != "waiting" || room.GameData["flag_start_scheduled"] == true {
		room.mu.Unlock()
		return
	}
	room.GameData["flag_start_scheduled"] = true
	room.mu.Unlock()

	go func() {
		startDelay := 700 * time.Millisecond
		if len(strings.Split(roomID, ":")) > 2 {
			startDelay = 2500 * time.Millisecond
		}
		time.Sleep(startDelay)
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			return
		}

		room.mu.Lock()
		if room.State != "waiting" {
			room.mu.Unlock()
			return
		}
		for len(room.Players) < room.Settings.MaxPlayers {
			bot := NewRuleBasedBot(room.Settings.Difficulty, "flag-team-battle")
			if room.Bots == nil {
				room.Bots = make(map[string]*RuleBasedBot)
			}
			room.Bots[bot.UserID] = bot
			if room.Bot == nil {
				room.Bot = bot
			}
			room.Players[bot.UserID] = &Player{
				ID:       bot.UserID,
				Username: bot.DisplayName,
				Level:    1,
				JoinedAt: time.Now(),
			}
		}
		room.mu.Unlock()

		room.Broadcast("players_updated", map[string]interface{}{"players": room.GetPlayers()})
		go h.startFlagTeamBattle(room)
	}()
}

func (h *Hub) startFlagTeamBattle(room *GameRoom) {
	room.mu.Lock()
	if room.State != "waiting" {
		room.mu.Unlock()
		return
	}
	room.State = "countdown"
	room.StartedAt = nowPtr()
	room.mu.Unlock()

	theme := roomTheme(room.ID, "flag_team_battle")
	questions := generateFlagTeamQuestions(theme)
	teams := assignFlagTeams(room)

	room.mu.Lock()
	room.Questions = questions
	room.CurrentQ = 0
	room.GameData = map[string]interface{}{
		"flag_state": flagTeamState{
			Teams:       teams,
			TeamScores:  map[string]int{"A": 0, "B": 0},
			TeamStreaks: map[string]int{"A": 0, "B": 0},
			Answered:    map[string]bool{},
			Resolved:    false,
		},
	}
	room.mu.Unlock()

	room.Broadcast("flag_team_assigned", map[string]interface{}{
		"teams":       teams,
		"team_scores": map[string]int{"A": 0, "B": 0},
		"theme":       theme,
	})
	room.Broadcast("game_starting", map[string]int{"countdown": 3})
	time.Sleep(3 * time.Second)

	room.mu.Lock()
	room.State = "playing"
	room.mu.Unlock()

	for i, q := range questions {
		room.mu.Lock()
		if room.State != "playing" {
			room.mu.Unlock()
			return
		}
		state := getFlagTeamState(room)
		state.Answered = map[string]bool{}
		state.Resolved = false
		room.GameData["flag_state"] = state
		room.CurrentQ = i
		room.mu.Unlock()

		room.Broadcast("flag_question", q)
		h.scheduleFlagBots(room, q)
		time.Sleep(8 * time.Second)

		room.mu.Lock()
		state = getFlagTeamState(room)
		if !state.Resolved {
			state.Resolved = true
			state.TeamStreaks["A"] = 0
			state.TeamStreaks["B"] = 0
			room.GameData["flag_state"] = state
			room.mu.Unlock()
			room.Broadcast("flag_round_timeout", map[string]interface{}{
				"question_id":    q.ID,
				"correct_answer": q.CorrectAnswer,
				"team_scores":    copyTeamScores(state.TeamScores),
				"resolved":       true,
			})
			time.Sleep(1200 * time.Millisecond)
		} else {
			room.mu.Unlock()
			time.Sleep(1200 * time.Millisecond)
		}
	}

	h.finishFlagTeamBattle(room)
}

func (h *Hub) scheduleFlagBots(room *GameRoom, q QuestionPayload) {
	room.mu.RLock()
	bots := make([]*RuleBasedBot, 0, len(room.Bots))
	for _, bot := range room.Bots {
		bots = append(bots, bot)
	}
	roomID := room.ID
	room.mu.RUnlock()

	for _, bot := range bots {
		delay := bot.GetDelay()
		go func(bot *RuleBasedBot, delay time.Duration) {
			time.Sleep(delay)
			room, ok := h.Rooms.Get(roomID)
			if !ok {
				return
			}
			answer := bot.AnswerQuestion(q)
			h.submitFlagTeamAnswer(room, bot.UserID, q.ID, answer.Answer, int(delay.Milliseconds()))
		}(bot, delay)
	}
}

func (h *Hub) handleFlagTeamAnswer(client *Client, payload SubmitFlagAnswerPayload) {
	room, ok := h.Rooms.Get(payload.RoomID)
	if !ok {
		client.SendMessage("error", map[string]string{"code": "ROOM_NOT_FOUND"})
		return
	}
	h.submitFlagTeamAnswer(room, client.UserID, payload.QuestionID, payload.Answer, payload.TimeTaken)
}

func (h *Hub) submitFlagTeamAnswer(room *GameRoom, userID, questionID, answer string, timeTaken int) {
	var event flagAnswerEvent
	shouldBroadcast := false
	shouldFinish := false

	room.mu.Lock()
	if room.State != "playing" || timeTaken < 100 {
		room.mu.Unlock()
		return
	}

	player, ok := room.Players[userID]
	if !ok {
		room.mu.Unlock()
		return
	}

	q := room.findQuestion(questionID)
	if q == nil || room.CurrentQ >= len(room.Questions) || room.Questions[room.CurrentQ].ID != questionID {
		room.mu.Unlock()
		return
	}

	state := getFlagTeamState(room)
	team := state.Teams[userID]
	if team == "" || state.Resolved || state.Answered[team] {
		room.mu.Unlock()
		return
	}

	normalizedAnswer := strings.TrimSpace(strings.ToLower(answer))
	normalizedCorrect := strings.TrimSpace(strings.ToLower(q.CorrectAnswer))
	isCorrect := normalizedAnswer == normalizedCorrect
	scoreDelta := -3
	resolved := false

	state.Answered[team] = true
	if isCorrect {
		scoreDelta = 10
		if len(state.Answered) > 1 {
			scoreDelta = 5
		}
		nextStreak := state.TeamStreaks[team] + 1
		if nextStreak > 0 && nextStreak%3 == 0 {
			scoreDelta += 10
		}
		state.TeamScores[team] += scoreDelta
		state.TeamStreaks[team] = nextStreak
		state.TeamStreaks[opponentTeam(team)] = 0
		state.Resolved = true
		player.Correct++
		resolved = true
	} else {
		state.TeamScores[team] += scoreDelta
		if state.TeamScores[team] < 0 {
			state.TeamScores[team] = 0
		}
		state.TeamStreaks[team] = 0
		player.Wrong++
		resolved = len(state.Answered) >= 2
		state.Resolved = resolved
	}
	player.Score += scoreDelta
	if player.Score < 0 {
		player.Score = 0
	}

	room.GameData["flag_state"] = state
	event = flagAnswerEvent{
		PlayerID:      userID,
		Username:      player.Username,
		Team:          team,
		IsCorrect:     isCorrect,
		ScoreDelta:    scoreDelta,
		TeamScore:     state.TeamScores[team],
		TeamScores:    copyTeamScores(state.TeamScores),
		CorrectAnswer: "",
		Resolved:      resolved,
		Message:       flagAnswerMessage(team, isCorrect, scoreDelta, resolved),
	}
	if resolved {
		event.CorrectAnswer = q.CorrectAnswer
	}
	shouldBroadcast = true
	shouldFinish = resolved && room.CurrentQ == len(room.Questions)-1
	room.mu.Unlock()

	if shouldBroadcast {
		room.Broadcast("flag_answer_result", event)
	}
	if shouldFinish {
		go func() {
			time.Sleep(1200 * time.Millisecond)
			h.finishFlagTeamBattle(room)
		}()
	}
}

func (h *Hub) finishFlagTeamBattle(room *GameRoom) {
	room.mu.Lock()
	if room.State == "finished" {
		room.mu.Unlock()
		return
	}
	state := getFlagTeamState(room)
	room.State = "finished"
	room.FinishedAt = nowPtr()
	results := flagTeamResults(room, state)
	winningTeam := "draw"
	if state.TeamScores["A"] > state.TeamScores["B"] {
		winningTeam = "A"
	} else if state.TeamScores["B"] > state.TeamScores["A"] {
		winningTeam = "B"
	}
	winnerID := firstWinnerID(results)
	teamScores := copyTeamScores(state.TeamScores)
	room.mu.Unlock()

	room.Broadcast("game_over", GameOverPayload{
		Results:     results,
		WinnerID:    winnerID,
		XPEarned:    75,
		TeamScores:  teamScores,
		WinningTeam: winningTeam,
	})

	if winnerID != "" {
		room.persistFinishedMatch(results, winnerID)
		if !strings.HasPrefix(winnerID, "bot_") {
			h.checkAchievements(winnerID)
		}
	}
}

func assignFlagTeams(room *GameRoom) map[string]string {
	room.mu.RLock()
	players := make([]*Player, 0, len(room.Players))
	for _, p := range room.Players {
		players = append(players, p)
	}
	room.mu.RUnlock()

	sort.SliceStable(players, func(i, j int) bool {
		leftBot := strings.HasPrefix(players[i].ID, "bot_")
		rightBot := strings.HasPrefix(players[j].ID, "bot_")
		if leftBot != rightBot {
			return !leftBot
		}
		return players[i].JoinedAt.Before(players[j].JoinedAt)
	})

	teams := make(map[string]string, len(players))
	for i, p := range players {
		if i%2 == 0 {
			teams[p.ID] = "A"
		} else {
			teams[p.ID] = "B"
		}
	}
	return teams
}

func getFlagTeamState(room *GameRoom) flagTeamState {
	if room.GameData == nil {
		room.GameData = map[string]interface{}{}
	}
	state, _ := room.GameData["flag_state"].(flagTeamState)
	if state.Teams == nil {
		state.Teams = map[string]string{}
	}
	if state.TeamScores == nil {
		state.TeamScores = map[string]int{"A": 0, "B": 0}
	}
	if state.TeamStreaks == nil {
		state.TeamStreaks = map[string]int{"A": 0, "B": 0}
	}
	if state.Answered == nil {
		state.Answered = map[string]bool{}
	}
	return state
}

func generateFlagTeamQuestions(theme string) []QuestionPayload {
	flags := loadFlagCountries(theme)
	questions := make([]QuestionPayload, 0, flagTeamTotalRounds)
	for i := 0; i < flagTeamTotalRounds; i++ {
		correct := flags[rand.Intn(len(flags))]
		optionSet := map[string]bool{correct.Name: true}
		options := []string{correct.Name}
		for len(options) < 4 {
			opt := flags[rand.Intn(len(flags))].Name
			if !optionSet[opt] {
				optionSet[opt] = true
				options = append(options, opt)
			}
		}
		rand.Shuffle(len(options), func(i, j int) { options[i], options[j] = options[j], options[i] })
		questions = append(questions, QuestionPayload{
			ID:             uuid.NewString(),
			Text:           "Bendera negara manakah ini?",
			Options:        options,
			QuestionNumber: i + 1,
			Total:          flagTeamTotalRounds,
			FlagCode:       strings.ToLower(correct.FlagCode),
			Region:         correct.Region,
			CorrectAnswer:  correct.Name,
		})
	}
	return questions
}

func loadFlagCountries(theme string) []flagCountry {
	var rows []model.Country
	database.DB.Find(&rows)

	flags := make([]flagCountry, 0, len(rows))
	for _, row := range rows {
		code := strings.ToLower(row.FlagCode)
		if len(code) == 2 && flagMatchesTheme(code, row.Region, theme) {
			flags = append(flags, flagCountry{Name: row.Name, FlagCode: code, Region: row.Region})
		}
	}
	if len(flags) >= 4 {
		return flags
	}
	fallback := []flagCountry{
		{Name: "Indonesia", FlagCode: "id", Region: "asia"},
		{Name: "Malaysia", FlagCode: "my", Region: "asia"},
		{Name: "Singapore", FlagCode: "sg", Region: "asia"},
		{Name: "Japan", FlagCode: "jp", Region: "asia"},
		{Name: "South Korea", FlagCode: "kr", Region: "asia"},
		{Name: "Germany", FlagCode: "de", Region: "europe"},
		{Name: "France", FlagCode: "fr", Region: "europe"},
		{Name: "United States", FlagCode: "us", Region: "americas"},
	}
	filtered := make([]flagCountry, 0, len(fallback))
	for _, flag := range fallback {
		if flagMatchesTheme(flag.FlagCode, flag.Region, theme) {
			filtered = append(filtered, flag)
		}
	}
	if len(filtered) >= 4 {
		return filtered
	}
	return fallback
}

func flagMatchesTheme(code, region, theme string) bool {
	switch normalizeRoomTheme("flag-team-battle", theme) {
	case "asia":
		return region == "asia"
	case "asean":
		return aseanFlagCodes[code]
	case "europe":
		return region == "europe"
	case "hard":
		return hardFlagCodes[code]
	default:
		return true
	}
}

func flagTeamResults(room *GameRoom, state flagTeamState) []PlayerResult {
	results := make([]PlayerResult, 0, len(room.Players))
	winningTeam := ""
	if state.TeamScores["A"] > state.TeamScores["B"] {
		winningTeam = "A"
	} else if state.TeamScores["B"] > state.TeamScores["A"] {
		winningTeam = "B"
	}

	for _, p := range room.Players {
		team := state.Teams[p.ID]
		results = append(results, PlayerResult{
			PlayerID: p.ID,
			Username: p.Username,
			Score:    state.TeamScores[team],
			Correct:  p.Correct,
			Wrong:    p.Wrong,
			IsWinner: winningTeam != "" && team == winningTeam,
		})
	}
	sort.SliceStable(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})
	return results
}

func firstWinnerID(results []PlayerResult) string {
	for _, result := range results {
		if result.IsWinner && !strings.HasPrefix(result.PlayerID, "bot_") {
			return result.PlayerID
		}
	}
	for _, result := range results {
		if result.IsWinner {
			return result.PlayerID
		}
	}
	return ""
}

func copyTeamScores(scores map[string]int) map[string]int {
	return map[string]int{"A": scores["A"], "B": scores["B"]}
}

func opponentTeam(team string) string {
	if team == "A" {
		return "B"
	}
	return "A"
}

func flagAnswerMessage(team string, correct bool, delta int, resolved bool) string {
	if correct {
		return "Tim " + team + " buzz benar. +" + itoa(delta) + " poin."
	}
	if resolved {
		return "Tim " + team + " salah. Ronde selesai."
	}
	return "Tim " + team + " salah. Tim lawan masih bisa rebut poin."
}
