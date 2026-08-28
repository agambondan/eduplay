package service

import (
	"fmt"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/email"
	"github.com/agambondan/eduplay/services/api/pkg/logger"
	"go.uber.org/zap"
)

type WeeklySummaryService struct {
	emailCl *email.ResendClient
}

func NewWeeklySummaryService(emailCl *email.ResendClient) *WeeklySummaryService {
	return &WeeklySummaryService{emailCl: emailCl}
}

type weeklyStats struct {
	Username      string
	GamesPlayed   int64
	XPEarned      int64
	Streak        int
	Level         int
	Achievements  int64
	GamesStr      string
	TopGame       string
	TotalSessions int64
}

func (s *WeeklySummaryService) SendWeeklySummaries() {
	if s.emailCl == nil {
		logger.Log.Warn("email client not available, skipping weekly summary")
		return
	}

	var users []model.User
	database.DB.Where("weekly_email_opt_in = ? AND email_verified_at IS NOT NULL", true).Find(&users)

	if len(users) == 0 {
		logger.Log.Info("no users opted in for weekly summary")
		return
	}

	weekAgo := time.Now().Add(-7 * 24 * time.Hour)
	sent := 0

	for _, u := range users {
		stats, err := s.getStats(u.ID.String(), weekAgo)
		if err != nil {
			logger.Log.Warn("failed to get weekly stats", zap.String("user", u.ID.String()), zap.Error(err))
			continue
		}

		html := s.buildEmail(stats)
		if err := s.emailCl.Send(u.Email, "Rekap Mingguan EduPlay 📊", html); err != nil {
			logger.Log.Warn("failed to send weekly summary", zap.String("user", u.ID.String()), zap.Error(err))
			continue
		}
		sent++
	}

	logger.Log.Info("weekly summary sent", zap.Int("sent", sent), zap.Int("total_users", len(users)))
}

func (s *WeeklySummaryService) getStats(userID string, since time.Time) (*weeklyStats, error) {
	stats := &weeklyStats{}

	var u model.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err != nil {
		return nil, err
	}
	stats.Username = u.Username
	stats.Streak = u.Streak
	stats.Level = u.Level

	database.DB.Model(&model.GameSession{}).
		Where("user_id = ? AND created_at >= ?", userID, since).
		Count(&stats.GamesPlayed)

	database.DB.Model(&model.GameSession{}).
		Where("user_id = ? AND created_at >= ?", userID, since).
		Select("COALESCE(SUM(xp_earned), 0)").
		Scan(&stats.XPEarned)

	database.DB.Model(&model.UserAchievement{}).
		Where("user_id = ? AND unlocked_at >= ?", userID, since).
		Count(&stats.Achievements)

	var topSession struct {
		GameName string
		Count    int
	}
	database.DB.Raw(`
		SELECT g.name as game_name, COUNT(*) as count
		FROM game_sessions gs
		JOIN games g ON g.id = gs.game_id
		WHERE gs.user_id = ? AND gs.created_at >= ?
		GROUP BY g.name
		ORDER BY count DESC
		LIMIT 1
	`, userID, since).Scan(&topSession)
	stats.TopGame = topSession.GameName

	database.DB.Model(&model.GameSession{}).
		Where("user_id = ?", userID).
		Count(&stats.TotalSessions)

	stats.GamesStr = fmt.Sprintf("%d games", stats.GamesPlayed)

	return stats, nil
}

func (s *WeeklySummaryService) buildEmail(stats *weeklyStats) string {
	topGameSection := ""
	if stats.TopGame != "" {
		topGameSection = fmt.Sprintf(`
			<tr>
				<td style="padding: 8px 0; color: #64748b;">Game Favorit</td>
				<td style="padding: 8px 0; font-weight: 600;">%s</td>
			</tr>`, stats.TopGame)
	}

	achievementSection := ""
	if stats.Achievements > 0 {
		achievementSection = fmt.Sprintf(`
			<tr>
				<td style="padding: 8px 0; color: #64748b;">Achievement Baru</td>
				<td style="padding: 8px 0; font-weight: 600;">%d 🏆</td>
			</tr>`, stats.Achievements)
	}

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
<h1 style="color:#ffffff;font-size:24px;margin:0;">Rekap Mingguan 📊</h1>
<p style="color:#c7d2fe;font-size:14px;margin:8px 0 0 0;">Hey %s, ini pencapaianmu minggu ini!</p>
</td></tr>
<tr><td style="padding:32px;">
<table width="100%%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:16px;background:#f8fafc;border-radius:12px;">
<p style="font-size:28px;font-weight:800;color:#6366f1;margin:0;">%d</p>
<p style="font-size:12px;color:#94a3b8;margin:4px 0 0 0;">Level</p>
</td>
<td align="center" style="padding:16px;background:#f8fafc;border-radius:12px;">
<p style="font-size:28px;font-weight:800;color:#6366f1;margin:0;">%d 🔥</p>
<p style="font-size:12px;color:#94a3b8;margin:4px 0 0 0;">Streak</p>
</td>
</tr>
</table>
<table width="100%%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
<tr><td style="padding:8px 0;color:#64748b;">Game Dimainkan</td><td style="padding:8px 0;font-weight:600;">%d 🎮</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">XP Minggu Ini</td><td style="padding:8px 0;font-weight:600;">%d ⚡</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Total Game (All Time)</td><td style="padding:8px 0;font-weight:600;">%d</td></tr>
%s
%s
</table>
</td></tr>
<tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="font-size:12px;color:#94a3b8;margin:0;">Main lagi di <a href="https://eduplay.id" style="color:#6366f1;text-decoration:none;font-weight:600;">EduPlay</a></p>
<p style="font-size:11px;color:#cbd5e1;margin:4px 0 0 0;">Kamu menerima email ini karena mengaktifkan notifikasi mingguan.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`, stats.Username, stats.Level, stats.Streak,
		stats.GamesPlayed, stats.XPEarned, stats.TotalSessions,
		topGameSection, achievementSection)
}

func StartWeeklySummaryScheduler(emailCl *email.ResendClient) {
	svc := NewWeeklySummaryService(emailCl)

	go func() {
		for {
			now := time.Now()
			nextMonday := now.AddDate(0, 0, (7-int(now.Weekday())+1)%7)
			nextRun := time.Date(nextMonday.Year(), nextMonday.Month(), nextMonday.Day(), 8, 0, 0, 0, time.UTC)
			if nextRun.Before(now) {
				nextRun = nextRun.AddDate(0, 0, 7)
			}
			time.Sleep(time.Until(nextRun))

			logger.Log.Info("running weekly summary scheduler")
			svc.SendWeeklySummaries()
		}
	}()

	logger.Log.Info("weekly summary scheduler started (next: Monday 08:00 UTC)")
}
