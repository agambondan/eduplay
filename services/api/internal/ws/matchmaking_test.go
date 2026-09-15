package ws

import (
	"context"
	"testing"

	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func setupMatchmakingTestRedis(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(mr.Close)
	database.RDB = redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

// TestTryLockPair_SameOpponentOnlyLocksOnce reproduces the phantom-match
// race: two different callers (A and C) both trying to claim the same
// opponent (B). Only one may succeed regardless of which "side" initiates.
func TestTryLockPair_SameOpponentOnlyLocksOnce(t *testing.T) {
	setupMatchmakingTestRedis(t)
	m := &MatchmakingService{}
	ctx := context.Background()

	if !m.tryLockPair(ctx, "math-battle", "A", "B") {
		t.Fatal("expected A to successfully lock pair with B")
	}
	if m.tryLockPair(ctx, "math-battle", "C", "B") {
		t.Fatal("expected C to fail locking B — B is already claimed by A")
	}
}

// TestTryLockPair_MutualClaimOnlySucceedsOnce reproduces the case where both
// participants' own independent matchmaking goroutines simultaneously try
// to claim each other from opposite perspectives (A locking opponent=B,
// B locking opponent=A) — order must not matter.
func TestTryLockPair_MutualClaimOnlySucceedsOnce(t *testing.T) {
	setupMatchmakingTestRedis(t)
	m := &MatchmakingService{}
	ctx := context.Background()

	if !m.tryLockPair(ctx, "math-battle", "A", "B") {
		t.Fatal("expected first claim (A locking B) to succeed")
	}
	if m.tryLockPair(ctx, "math-battle", "B", "A") {
		t.Fatal("expected reverse-order claim (B locking A) to fail — already locked")
	}
}

func TestTryLockPair_DifferentPairsDoNotContend(t *testing.T) {
	setupMatchmakingTestRedis(t)
	m := &MatchmakingService{}
	ctx := context.Background()

	if !m.tryLockPair(ctx, "math-battle", "A", "B") {
		t.Fatal("expected A-B lock to succeed")
	}
	if !m.tryLockPair(ctx, "math-battle", "C", "D") {
		t.Fatal("expected unrelated C-D lock to succeed independently")
	}
}
