package service

type mockAchievement struct{}

func (m *mockAchievement) CheckAndUnlock(userID string, slug string) (bool, error) {
	return false, nil
}

func (m *mockAchievement) CheckFirstGame(userID string) error {
	return nil
}

func (m *mockAchievement) CheckAllGames(userID string) error {
	return nil
}

func (m *mockAchievement) CheckTop10(userID string) error {
	return nil
}

func (m *mockAchievement) CheckDailyCount(userID string) error {
	return nil
}

type mockLeaderboard struct{}

func (m *mockLeaderboard) AddGameScore(gameID string, userID string, score float64) error {
	return nil
}

func (m *mockLeaderboard) GetGameLeaderboard(slug string, period string, userID string, limit int64) (*LeaderboardResponse, error) {
	return nil, nil
}

func (m *mockLeaderboard) GetGlobalLeaderboard(userID string, limit int64) (*LeaderboardResponse, error) {
	return nil, nil
}
