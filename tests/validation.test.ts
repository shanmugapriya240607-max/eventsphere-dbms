import assert from "node:assert/strict";
import test from "node:test";
import { validateEmail, validateEventInput, validateRole, ValidationError } from "../src/lib/validation";

const validEvent = {
  name: "Database Workshop",
  category: "Workshop",
  description: "A practical MySQL workshop.",
  eventDate: "2026-12-20",
  startTime: "10:00 AM",
  venue: "Innovation Lab",
  registrationDeadline: "2026-12-15",
  availableSeats: 50,
  rules: "Bring a laptop.",
  facultyCoordinator: "Dr. Test",
  studentCoordinator: "Student Test",
  prizeDetails: "Certificates",
  posterUrl: "https://example.com/poster.jpg",
  status: "open",
};

test("normalizes and validates authentication fields", () => {
  assert.equal(validateEmail(" Student@Example.edu "), "student@example.edu");
  assert.equal(validateRole("admin"), "admin");
  assert.throws(() => validateRole("owner"), ValidationError);
  assert.throws(() => validateEmail("invalid"), ValidationError);
});

test("accepts a complete event payload", () => {
  assert.deepEqual(validateEventInput(validEvent), validEvent);
});

test("rejects invalid capacity and dates", () => {
  assert.throws(() => validateEventInput({ ...validEvent, availableSeats: -1 }), /Available seats/);
  assert.throws(
    () => validateEventInput({ ...validEvent, registrationDeadline: "2026-12-21" }),
    /deadline cannot be after/,
  );
});

test("rejects incomplete event payloads", () => {
  assert.throws(() => validateEventInput({ ...validEvent, name: "" }), /Event name is required/);
});
