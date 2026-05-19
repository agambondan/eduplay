INSERT INTO games (slug, name, description, category, is_active) VALUES
('math-quiz', 'Math Quiz Blitz', 'Jawab soal matematika secepat mungkin dalam 60 detik', 'math', true),
('times-table', 'Times Table Challenge', 'Drilling perkalian 1-12 secara gamified', 'math', true),
('wordle', 'Wordle Bahasa Indonesia', 'Tebak kata bahasa Indonesia 5 huruf', 'language', true),
('spelling-bee', 'Spelling Bee', 'Susun huruf-huruf acak menjadi kata yang benar', 'language', true),
('flag-quiz', 'Flag Quiz', 'Tebak nama negara dari gambar benderanya', 'geography', true),
('capital-quiz', 'Capital City Quiz', 'Tebak ibukota dari nama negara', 'geography', true),
('sudoku', 'Sudoku', 'Classic Sudoku 9x9', 'logic', true),
('2048', '2048', 'Classic 2048 — geser tile, gabungkan angka yang sama', 'logic', true),
('nonogram', 'Nonogram', 'Asah logika dengan mengungkapkan gambar tersembunyi', 'logic', true),
('mental-math', 'Mental Math Speed', 'Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin', 'math', true),
('element-quiz', 'Element Quiz', 'Tebak nama unsur kimia dari simbolnya', 'science', true),
('word-search', 'Word Search', 'Asah ketelitianmu dengan mencari kata-kata tersembunyi', 'language', true),
('timeline-history', 'Timeline History', 'Tebak tahun kejadian penting di Indonesia dan Dunia', 'history', true),
('crossword', 'Crossword Indonesia', 'Uji wawasan kosakata dengan Teka-Teki Silang', 'language', true),
('bubble-shooter', 'Bubble Shooter Math', 'Tembak bubble dan jumlahkan angka dengan tepat', 'math', true)
ON CONFLICT (slug) DO NOTHING;
