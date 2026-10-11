export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function text(input: unknown, label: string, maxLength: number) {
  if (typeof input !== "string" || !input.trim()) throw new ValidationError(`${label} is required.`);
  const value = input.trim();
  if (value.length > maxLength) throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`);
  return value;
}

function isoDate(input: unknown, label: string) {
  const value = text(input, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new ValidationError(`${label} must be a valid date.`);
  }
  return value;
}

export function validateEmail(input: unknown) {
  const value = text(input, "Email", 190).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new ValidationError("Enter a valid email address.");
  return value;
}

export function validateRole(input: unknown): "student" | "admin" {
  if (input !== "student" && input !== "admin") throw new ValidationError("Select a valid login portal.");
  return input;
}

export type EventInput = {
  name: string;
  category: string;
  description: string;
  eventDate: string;
  startTime: string;
  venue: string;
  registrationDeadline: string;
  availableSeats: number;
  rules: string;
  facultyCoordinator: string;
  studentCoordinator: string;
  prizeDetails: string;
  posterUrl: string;
  status: string;
};

export function validateEventInput(input: Record<string, unknown>): EventInput {
  const seats = Number(input.availableSeats);
  if (!Number.isInteger(seats) || seats < 0 || seats > 100000) {
    throw new ValidationError("Available seats must be a whole number between 0 and 100000.");
  }
  const status = text(input.status ?? "open", "Status", 20);
  if (!["draft", "open", "featured", "closed", "cancelled"].includes(status)) {
    throw new ValidationError("Select a valid event status.");
  }
  const eventDate = isoDate(input.eventDate, "Event date");
  const registrationDeadline = isoDate(input.registrationDeadline, "Registration deadline");
  if (registrationDeadline > eventDate) throw new ValidationError("Registration deadline cannot be after the event date.");

  return {
    name: text(input.name, "Event name", 160),
    category: text(input.category, "Category", 80),
    description: text(input.description, "Description", 5000),
    eventDate,
    startTime: text(input.startTime, "Start time", 20),
    venue: text(input.venue, "Venue", 120),
    registrationDeadline,
    availableSeats: seats,
    rules: text(input.rules, "Rules", 5000),
    facultyCoordinator: text(input.facultyCoordinator, "Faculty coordinator", 120),
    studentCoordinator: text(input.studentCoordinator, "Student coordinator", 120),
    prizeDetails: text(input.prizeDetails, "Prize details", 5000),
    posterUrl: text(input.posterUrl, "Poster URL", 500),
    status,
  };
}

export function validateId(input: unknown, label = "ID") {
  return text(input, label, 40);
}
