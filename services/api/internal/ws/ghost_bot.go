package ws

import (
	"math/rand"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
)

type GhostBotPlayer struct {
	UserID      string
	DisplayName string
	Score       int
	Events      []model.GhostEvent
	Difficulty  string
}

func NewGhostBotPlayer(name, difficulty string, score int, events []model.GhostEvent) *GhostBotPlayer {
	return &GhostBotPlayer{
		UserID:      "ghost_" + randString(8),
		DisplayName: name,
		Score:       score,
		Events:      events,
		Difficulty:  difficulty,
	}
}

func (g *GhostBotPlayer) Run(room *GameRoom) {
	for i, q := range room.Questions {
		select {
		case <-room.done:
			return
		default:
		}

		if i >= len(g.Events) {
			fallbackDelay := time.Duration(2+rand.Intn(3)) * time.Second
			time.Sleep(fallbackDelay)
			room.SubmitAnswer(g.UserID, q.ID, "0", int(fallbackDelay.Milliseconds()))
			continue
		}

		event := g.Events[i]

		if i > 0 {
			prev := g.Events[i-1].Timestamp
			wait := event.Timestamp - prev
			if wait > 30*time.Second {
				wait = 10 * time.Second
			}
			if wait < 500*time.Millisecond {
				wait = 500 * time.Millisecond
			}
			time.Sleep(wait)
		}

		timeTakenMs := int(event.TimeTaken.Milliseconds())
		if timeTakenMs < 200 {
			timeTakenMs = 200 + rand.Intn(500)
		}

		answer := g.pickAnswer(q, event.IsCorrect)
		room.SubmitAnswer(g.UserID, q.ID, answer, timeTakenMs)
	}
}

func (g *GhostBotPlayer) pickAnswer(q QuestionPayload, wantCorrect bool) string {
	if q.CorrectAnswer == "" || len(q.Options) == 0 {
		return "0"
	}

	wrongOpts := make([]string, 0, len(q.Options)-1)
	for _, opt := range q.Options {
		if opt != q.CorrectAnswer {
			wrongOpts = append(wrongOpts, opt)
		}
	}

	if wantCorrect {
		return q.CorrectAnswer
	}

	if len(wrongOpts) > 0 {
		return wrongOpts[rand.Intn(len(wrongOpts))]
	}
	return "0"
}

func randString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
