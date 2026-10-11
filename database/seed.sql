USE eventsphere_db;

INSERT INTO venues (id, name, location, capacity) VALUES
('venue_auditorium', 'Main Auditorium', 'Academic Block A', 500),
('venue_innovation', 'Innovation Lab', 'Technology Block', 120),
('venue_seminar_a', 'Seminar Hall A', 'Academic Block B', 180)
ON DUPLICATE KEY UPDATE location = VALUES(location), capacity = VALUES(capacity);

INSERT INTO users (id, full_name, email, password_hash, role, email_verified, department) VALUES
('admin_eventsphere', 'EventSphere Administrator', 'admin@eventsphere.edu', 'pbkdf2$100000$0123456789abcdef0123456789abcdef$5a788e9dceae3cf538b8d81c2e1c7db5b16c495508843e25743f72b5f7da7bf8', 'admin', TRUE, 'Computer Science'),
('student_demo', 'Demo Student', 'student@eventsphere.edu', 'pbkdf2$100000$0123456789abcdef0123456789abcdef$5a788e9dceae3cf538b8d81c2e1c7db5b16c495508843e25743f72b5f7da7bf8', 'student', TRUE, 'CSE')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash);

INSERT INTO events (id, name, slug, category, description, event_date, start_time, venue, venue_id, registration_deadline, available_seats, rules, faculty_coordinator, student_coordinator, prize_details, poster_url, status) VALUES
('evt_hackathon', 'Campus Innovation Hackathon', 'campus-innovation-hackathon', 'Hackathon', 'Build practical solutions for a smarter and more sustainable campus.', '2026-11-14', '09:00 AM', 'Main Auditorium', 'venue_auditorium', '2026-11-08', 200, 'College ID is mandatory. Teams must report 30 minutes early.', 'Dr. Kavya Raman', 'Priya N', 'Winner Rs. 25000; runner-up Rs. 15000', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d', 'featured'),
('evt_dbms_quiz', 'DBMS Technical Quiz', 'dbms-technical-quiz', 'Quiz', 'Test relational design, SQL, normalization, transactions, and indexing knowledge.', '2026-11-15', '10:30 AM', 'Seminar Hall A', 'venue_seminar_a', '2026-11-10', 120, 'Individual participation. College ID is mandatory.', 'Prof. Arjun Menon', 'Rahul V', 'Winner Rs. 10000; runner-up Rs. 5000', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c', 'open'),
('evt_web_sprint', 'Full-Stack Web Sprint', 'full-stack-web-sprint', 'Development', 'Design and deliver a responsive event solution within the allotted time.', '2026-11-15', '01:30 PM', 'Innovation Lab', 'venue_innovation', '2026-11-10', 80, 'Teams of two. Bring your own laptop.', 'Dr. Nisha Verma', 'Aadhav S', 'Winner Rs. 15000; runner-up Rs. 8000', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085', 'open')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), available_seats = VALUES(available_seats);

INSERT INTO event_schedules (id, event_id, venue_id, schedule_date, start_time, end_time) VALUES
('schedule_hackathon', 'evt_hackathon', 'venue_auditorium', '2026-11-14', '09:00:00', '17:00:00'),
('schedule_quiz', 'evt_dbms_quiz', 'venue_seminar_a', '2026-11-15', '10:30:00', '12:00:00'),
('schedule_web', 'evt_web_sprint', 'venue_innovation', '2026-11-15', '13:30:00', '16:30:00')
ON DUPLICATE KEY UPDATE end_time = VALUES(end_time);
