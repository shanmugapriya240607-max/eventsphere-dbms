CREATE DATABASE IF NOT EXISTS eventsphere_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE eventsphere_db;

-- statement
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(40) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  register_number VARCHAR(40) UNIQUE,
  college_name VARCHAR(160), department VARCHAR(100), year_of_study TINYINT,
  email VARCHAR(190) NOT NULL UNIQUE, mobile_number VARCHAR(25), gender VARCHAR(30), city VARCHAR(100),
  profile_photo VARCHAR(500), emergency_contact VARCHAR(25), food_preference VARCHAR(30),
  accommodation_required BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash VARCHAR(255) NOT NULL, role ENUM('student','admin') NOT NULL DEFAULT 'student',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE, verification_token VARCHAR(100), reset_token VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_users_year CHECK (year_of_study IS NULL OR year_of_study BETWEEN 1 AND 6),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- statement
CREATE TABLE IF NOT EXISTS venues (
  id VARCHAR(40) PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE, location VARCHAR(180) NOT NULL,
  capacity INT NOT NULL, status ENUM('available','maintenance','inactive') NOT NULL DEFAULT 'available',
  CONSTRAINT chk_venues_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

-- statement
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(40) PRIMARY KEY, name VARCHAR(160) NOT NULL, slug VARCHAR(180) NOT NULL UNIQUE,
  category VARCHAR(80) NOT NULL, description TEXT NOT NULL, event_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL, venue VARCHAR(120) NOT NULL, venue_id VARCHAR(40),
  registration_deadline DATE NOT NULL, available_seats INT NOT NULL DEFAULT 100, rules TEXT NOT NULL,
  faculty_coordinator VARCHAR(120) NOT NULL, student_coordinator VARCHAR(120) NOT NULL,
  prize_details TEXT NOT NULL, poster_url VARCHAR(500) NOT NULL,
  status ENUM('draft','open','featured','closed','cancelled') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,
  CONSTRAINT chk_events_seats CHECK (available_seats >= 0),
  INDEX idx_events_date_status (event_date, status), INDEX idx_events_category (category)
) ENGINE=InnoDB;

-- statement
CREATE TABLE IF NOT EXISTS event_schedules (
  id VARCHAR(40) PRIMARY KEY, event_id VARCHAR(40) NOT NULL, venue_id VARCHAR(40) NOT NULL,
  schedule_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  CONSTRAINT fk_schedules_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_schedules_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,
  CONSTRAINT chk_schedule_times CHECK (end_time > start_time),
  UNIQUE KEY uq_event_schedule (event_id, schedule_date, start_time),
  INDEX idx_schedule_venue_slot (venue_id, schedule_date, start_time, end_time)
) ENGINE=InnoDB;

-- statement
CREATE TABLE IF NOT EXISTS registrations (
  id VARCHAR(40) PRIMARY KEY, user_id VARCHAR(40) NOT NULL, event_id VARCHAR(40) NOT NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  confirmation_code VARCHAR(40) NOT NULL UNIQUE, checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_registrations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_registrations_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY uq_registrations_user_event (user_id, event_id), INDEX idx_registrations_event_status (event_id, status)
) ENGINE=InnoDB;

-- statement
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(40) PRIMARY KEY, registration_id VARCHAR(40) NOT NULL UNIQUE, marked_by VARCHAR(40) NOT NULL,
  status ENUM('present','absent') NOT NULL, marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_registration FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_admin FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- statement
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(40) PRIMARY KEY, title VARCHAR(180) NOT NULL, message TEXT NOT NULL,
  audience ENUM('all','students','admin') NOT NULL DEFAULT 'all', priority ENUM('normal','high') NOT NULL DEFAULT 'normal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- statement
CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(40) PRIMARY KEY, user_id VARCHAR(40) NOT NULL, event_id VARCHAR(40) NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'Participation', certificate_no VARCHAR(60) NOT NULL UNIQUE,
  file_url VARCHAR(500) NOT NULL, issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_certificates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_certificates_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- statement
CREATE TABLE IF NOT EXISTS coordinators (
  id VARCHAR(40) PRIMARY KEY, name VARCHAR(120) NOT NULL, role VARCHAR(60) NOT NULL,
  department VARCHAR(100) NOT NULL, email VARCHAR(190) NOT NULL, phone VARCHAR(25) NOT NULL, event_id VARCHAR(40),
  CONSTRAINT fk_coordinators_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- statement
CREATE OR REPLACE VIEW event_registration_summary AS
SELECT e.id, e.name, e.event_date, e.venue, e.available_seats,
       COUNT(r.id) AS total_registrations,
       SUM(r.status = 'approved') AS approved_registrations
FROM events e LEFT JOIN registrations r ON r.event_id = e.id
GROUP BY e.id, e.name, e.event_date, e.venue, e.available_seats;

-- statement
DROP TRIGGER IF EXISTS prevent_venue_schedule_overlap;

-- statement
CREATE TRIGGER prevent_venue_schedule_overlap
BEFORE INSERT ON event_schedules FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM event_schedules s
    WHERE s.id <> NEW.id AND s.venue_id = NEW.venue_id AND s.schedule_date = NEW.schedule_date
      AND NEW.start_time < s.end_time AND NEW.end_time > s.start_time
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venue is already booked during this time range';
  END IF;
END;

-- statement
DROP TRIGGER IF EXISTS prevent_venue_schedule_overlap_update;

-- statement
CREATE TRIGGER prevent_venue_schedule_overlap_update
BEFORE UPDATE ON event_schedules FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM event_schedules s
    WHERE s.id <> NEW.id AND s.venue_id = NEW.venue_id AND s.schedule_date = NEW.schedule_date
      AND NEW.start_time < s.end_time AND NEW.end_time > s.start_time
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venue is already booked during this time range';
  END IF;
END;
