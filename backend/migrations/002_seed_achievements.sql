INSERT INTO achievements (slug, name, description, xp_reward, icon) VALUES
('first-game', 'Pemula', 'Main game pertama kali', 50, 'medal'),
('streak-3', 'Konsisten', 'Streak 3 hari', 100, 'flame'),
('streak-7', 'Rajin', 'Streak 7 hari', 300, 'flame'),
('streak-30', 'Dedikasi', 'Streak 30 hari', 1000, 'crown'),
('math-master', 'Math Master', 'Skor 500+ di Math Quiz', 200, 'calculator'),
('wordle-genius', 'Wordle Genius', 'Tebak Wordle dalam 2 percobaan', 300, 'brain'),
('daily-5', 'Daily Warrior', 'Complete 5 daily challenge', 200, 'sword'),
('top-10', 'Elite', 'Masuk top 10 leaderboard', 500, 'trophy'),
('level-5', 'Naik Kelas', 'Capai Level 5', 0, 'star'),
('all-games', 'Explorer', 'Coba semua game', 300, 'compass')
ON CONFLICT (slug) DO NOTHING;
