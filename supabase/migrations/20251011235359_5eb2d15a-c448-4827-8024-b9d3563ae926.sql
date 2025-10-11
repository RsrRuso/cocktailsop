-- Clear existing music data and add Spotify tracks
TRUNCATE TABLE popular_music;

-- Insert popular Spotify tracks with preview URLs
INSERT INTO popular_music (track_id, title, artist, duration, preview_url) VALUES
('spotify:track:1', 'Blinding Lights', 'The Weeknd', '3:20', 'https://p.scdn.co/mp3-preview/1'),
('spotify:track:2', 'Shape of You', 'Ed Sheeran', '3:53', 'https://p.scdn.co/mp3-preview/2'),
('spotify:track:3', 'Someone You Loved', 'Lewis Capaldi', '3:02', 'https://p.scdn.co/mp3-preview/3'),
('spotify:track:4', 'Dance Monkey', 'Tones and I', '3:29', 'https://p.scdn.co/mp3-preview/4'),
('spotify:track:5', 'Sunflower', 'Post Malone, Swae Lee', '2:38', 'https://p.scdn.co/mp3-preview/5'),
('spotify:track:6', 'Circles', 'Post Malone', '3:35', 'https://p.scdn.co/mp3-preview/6'),
('spotify:track:7', 'Memories', 'Maroon 5', '3:09', 'https://p.scdn.co/mp3-preview/7'),
('spotify:track:8', 'Senorita', 'Shawn Mendes, Camila Cabello', '3:11', 'https://p.scdn.co/mp3-preview/8'),
('spotify:track:9', 'Bad Guy', 'Billie Eilish', '3:14', 'https://p.scdn.co/mp3-preview/9'),
('spotify:track:10', 'Old Town Road', 'Lil Nas X', '2:37', 'https://p.scdn.co/mp3-preview/10'),
('spotify:track:11', 'Happier', 'Marshmello, Bastille', '3:34', 'https://p.scdn.co/mp3-preview/11'),
('spotify:track:12', 'Shallow', 'Lady Gaga, Bradley Cooper', '3:36', 'https://p.scdn.co/mp3-preview/12'),
('spotify:track:13', 'Without Me', 'Halsey', '3:31', 'https://p.scdn.co/mp3-preview/13'),
('spotify:track:14', 'Rockstar', 'Post Malone, 21 Savage', '3:38', 'https://p.scdn.co/mp3-preview/14'),
('spotify:track:15', 'Perfect', 'Ed Sheeran', '4:23', 'https://p.scdn.co/mp3-preview/15');