import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";

async function login(email: string, role: "admin" | "student") {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "EventSphere@2026", role }),
  });
  assert.equal(response.status, 200, `${role} login failed`);
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Login cookie missing");
  return setCookie.split(";", 1)[0];
}

async function request(path: string, cookie: string, method = "GET", body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function json<T>(response: Response) {
  return response.json() as Promise<T>;
}

async function main() {
  const admin = await login("admin@eventsphere.edu", "admin");
  const student = await login("student@eventsphere.edu", "student");
  let venueId: string | undefined;
  let eventA: string | undefined;
  let eventB: string | undefined;
  try {
    assert.equal((await request("/api/venues", student, "POST", { name: "Unauthorized", location: "X", capacity: 10, status: "available" })).status, 403);

    const venueResponse = await request("/api/venues", admin, "POST", { name: "Priority 2 Test Hall", location: "Test Block", capacity: 25, status: "available" });
    assert.equal(venueResponse.status, 201);
    venueId = (await json<{ venue: { id: string } }>(venueResponse)).venue.id;

    const eventInput = {
      category: "Testing", description: "Temporary Priority 2 verification event.", eventDate: "2026-12-22",
      startTime: "10:00", venue: "Priority 2 Test Hall", registrationDeadline: "2026-12-18", availableSeats: 5,
      rules: "Automated test.", facultyCoordinator: "Test Faculty", studentCoordinator: "Test Student", prizeDetails: "Test",
      posterUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c", status: "open",
    };
    const firstEventResponse = await request("/api/events", admin, "POST", { ...eventInput, name: "Priority 2 Schedule A" });
    const secondEventResponse = await request("/api/events", admin, "POST", { ...eventInput, name: "Priority 2 Schedule B" });
    assert.equal(firstEventResponse.status, 201);
    assert.equal(secondEventResponse.status, 201);
    eventA = (await json<{ event: { id: string } }>(firstEventResponse)).event.id;
    eventB = (await json<{ event: { id: string } }>(secondEventResponse)).event.id;

    const scheduleResponse = await request("/api/schedules", admin, "POST", { eventId: eventA, venueId, scheduleDate: "2026-12-22", startTime: "10:00", endTime: "12:00" });
    assert.equal(scheduleResponse.status, 201);
    const conflictResponse = await request("/api/schedules", admin, "POST", { eventId: eventB, venueId, scheduleDate: "2026-12-22", startTime: "11:00", endTime: "13:00" });
    assert.equal(conflictResponse.status, 409);
    const conflict = await json<{ error: string }>(conflictResponse);
    assert.match(conflict.error, /already booked/i);

    const registrationResponse = await request("/api/registrations", student, "POST", { eventId: eventA });
    assert.equal(registrationResponse.status, 201);
    const registrationId = (await json<{ registration: { id: string } }>(registrationResponse)).registration.id;
    assert.equal((await request("/api/registrations", admin, "PATCH", { id: registrationId, status: "approved" })).status, 200);
    assert.equal((await request("/api/attendance", admin, "PUT", { registrationId, status: "absent" })).status, 200);
    assert.equal((await request("/api/attendance", admin, "PUT", { registrationId, status: "present" })).status, 200);
    assert.equal((await request("/api/attendance", student, "PUT", { registrationId, status: "present" })).status, 403);

    const attendanceRows = await json<{ attendance: Array<{ attendance: { status: string }; registration: { id: string } }> }>(await request("/api/attendance", admin));
    const matches = attendanceRows.attendance.filter((row) => row.registration.id === registrationId);
    assert.equal(matches.length, 1, "Attendance upsert created a duplicate row");
    assert.equal(matches[0].attendance.status, "present", "Attendance did not persist");

    console.log(JSON.stringify({ venueCrud: "passed", overlapConflict: "passed", attendancePersistence: "passed", attendanceUniqueness: "passed", authorization: "passed" }, null, 2));
  } finally {
    if (eventA) await request(`/api/events?id=${eventA}`, admin, "DELETE");
    if (eventB) await request(`/api/events?id=${eventB}`, admin, "DELETE");
    if (venueId) await request(`/api/venues?id=${venueId}`, admin, "DELETE");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Priority 2 integration test failed.");
  process.exitCode = 1;
});
