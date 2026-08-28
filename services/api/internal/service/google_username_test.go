package service

import (
	"testing"
	"unicode/utf8"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedUsername(t *testing.T, username, email string) {
	t.Helper()
	require.NoError(t, database.DB.Create(&model.User{
		Username: username,
		Email:    email,
		Password: "x",
	}).Error)
}

func TestDeriveGoogleUsername(t *testing.T) {
	t.Run("free name is used as-is", func(t *testing.T) {
		setupTestDB()
		assert.Equal(t, "Budi Santoso", deriveGoogleUsername("Budi Santoso", "budi@gmail.com"))
	})

	t.Run("collision gets a numeric suffix", func(t *testing.T) {
		setupTestDB()
		seedUsername(t, "Budi Santoso", "first@gmail.com")
		assert.Equal(t, "Budi Santoso1", deriveGoogleUsername("Budi Santoso", "budi@gmail.com"))
	})

	t.Run("repeated collisions keep counting", func(t *testing.T) {
		setupTestDB()
		seedUsername(t, "Budi", "a@gmail.com")
		seedUsername(t, "Budi1", "b@gmail.com")
		seedUsername(t, "Budi2", "c@gmail.com")
		assert.Equal(t, "Budi3", deriveGoogleUsername("Budi", "budi@gmail.com"))
	})

	t.Run("blank name falls back to the email local part", func(t *testing.T) {
		setupTestDB()
		assert.Equal(t, "firman.agam", deriveGoogleUsername("", "firman.agam@gmail.com"))
	})

	t.Run("blank name and unusable email falls back to player", func(t *testing.T) {
		setupTestDB()
		assert.Equal(t, "player", deriveGoogleUsername("", ""))
	})

	t.Run("over-long name is truncated to the column width", func(t *testing.T) {
		setupTestDB()
		got := deriveGoogleUsername("Muhammad Abdurrahman Al Fatih Bin Abdullah", "long@gmail.com")
		assert.LessOrEqual(t, utf8.RuneCountInString(got), 30)
		assert.Equal(t, "Muhammad Abdurrahman Al Fatih", got[:29])
	})

	t.Run("truncated name still leaves room for the suffix", func(t *testing.T) {
		setupTestDB()
		long := "Muhammad Abdurrahman Al Fatih Bin Abdullah"
		first := deriveGoogleUsername(long, "a@gmail.com")
		seedUsername(t, first, "a@gmail.com")

		second := deriveGoogleUsername(long, "b@gmail.com")
		assert.NotEqual(t, first, second)
		assert.LessOrEqual(t, utf8.RuneCountInString(second), 30,
			"suffixed username must still fit the varchar(30) column")
	})

	t.Run("truncation is rune-safe for non-ascii names", func(t *testing.T) {
		setupTestDB()
		// 40 multi-byte runes: byte slicing would split one and corrupt it.
		name := ""
		for i := 0; i < 40; i++ {
			name += "あ"
		}
		got := deriveGoogleUsername(name, "jp@gmail.com")
		assert.True(t, utf8.ValidString(got), "username must remain valid UTF-8")
		assert.Equal(t, 30, utf8.RuneCountInString(got))
	})

	t.Run("result is always actually free", func(t *testing.T) {
		setupTestDB()
		seedUsername(t, "Budi", "a@gmail.com")
		got := deriveGoogleUsername("Budi", "budi@gmail.com")

		var count int64
		require.NoError(t, database.DB.Model(&model.User{}).Where("username = ?", got).Count(&count).Error)
		assert.Zero(t, count, "derived username %q must not already exist", got)
	})
}
