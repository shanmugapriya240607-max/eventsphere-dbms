USE eventsphere_db;

-- Join: participant roster with event information.
SELECT e.name AS event_name, u.full_name, u.register_number, r.status, r.confirmation_code
FROM registrations r
JOIN users u ON u.id = r.user_id
JOIN events e ON e.id = r.event_id
ORDER BY e.event_date, e.name, u.full_name;

-- Subquery: events whose approved registration count is above the average.
SELECT e.id, e.name,
       (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved_count
FROM events e
WHERE (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved') >
      (SELECT AVG(event_total) FROM (
         SELECT COUNT(*) AS event_total FROM registrations WHERE status = 'approved' GROUP BY event_id
       ) totals);

-- View-backed report.
SELECT * FROM event_registration_summary ORDER BY total_registrations DESC;

-- Transaction pattern used for capacity-safe approval.
START TRANSACTION;
SELECT available_seats FROM events WHERE id = 'evt_hackathon' FOR UPDATE;
UPDATE registrations SET status = 'approved' WHERE id = 'replace_registration_id' AND status = 'pending';
UPDATE events SET available_seats = available_seats - 1
WHERE id = 'evt_hackathon' AND available_seats > 0 AND ROW_COUNT() = 1;
COMMIT;
