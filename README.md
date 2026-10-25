# srb-api: Study Room Booking Service

**CSC337 Advanced Web Technologies, Assignment 1**
Zain Ul Wahaj (FA23-BAI-058)

This is the backend for a small study room booking system. Rooms have two-hour slots (8, 10, 12, 14 and 16 o'clock) and a student can book a seat in a slot. The same project has a REST API, a GraphQL endpoint and a live seat board that uses Socket.IO.

Built with Node.js, Express 5, MongoDB (Mongoose), Apollo Server and Socket.IO.

## Running it

You need Node.js 20 or newer and a MongoDB server (a local install or a free Atlas cluster both work).

```bash
npm install
cp .env.example .env      # then set MONGO_URL and ADMIN_KEY
npm run seed              # 3 rooms, 11 slots, 3 students, 2 bookings
npm start                 # or: npm run dev (restarts on changes)
```

The server prints its addresses when it starts:

- REST API: http://localhost:3000/api/v1
- GraphQL: http://localhost:3000/graphql (opening it in a browser shows Apollo Sandbox)
- Live board: http://localhost:3000/board.html?room=ROOM-01
- Admin page: http://localhost:3000/admin.html

`.env` holds `PORT`, `MONGO_URL` and `ADMIN_KEY`. It is in `.gitignore`, so only `.env.example` is committed.

## Folder layout

```
srb-api/
├── app.js               builds the Express app (middleware, routes, 404, error handler)
├── server.js            connects to MongoDB, starts Apollo and Socket.IO, listens on PORT
├── config/              .env loading and the MongoDB connection
├── routes/              URL → controller mapping
├── controllers/         read the request, call a service, send the response
├── services/            all the real logic (validation, booking rules, database calls)
├── models/              Mongoose schemas: Room, Slot, Student, Booking
├── middleware/          request logger, 404 handler, error handler
├── graphql/             schema, resolvers and the Apollo setup
├── sockets/             Socket.IO namespaces and the slot:updated helper
├── utils/               ApiError class and small validation helpers
├── public/              board.html and admin.html
├── scripts/seed.js      sample data
├── postman/             Postman collection
├── docs/                draw.io diagrams
└── dashboard.graphql    the one-request student dashboard query
```

Controllers never touch the database directly. They only call services, and GraphQL resolvers call the same services. Because of that, the booking rules exist in one place (`services/bookingService.js`).

## Question 1: setup and basic routing

- `GET /health` returns `{ "status": "ok" }`.
- `middleware/requestLogger.js` prints one line per request once the response is finished, for example `POST /api/v1/students/FA23-BAI-058/bookings 201 - 14.2 ms`.
- Unknown routes go to `middleware/notFound.js`, and every error ends up in `middleware/errorHandler.js`, so all errors have the same shape:

```json
{ "error": { "status": 404, "message": "Route not found" } }
```

Errors from the booking rules also carry a `code`, for example `{ "error": { "status": 409, "message": "This slot is already full", "code": "SLOT_FULL" } }`.

## Question 2: diagrams

`docs/srb-api-diagrams.drawio` has three pages. Open it at https://app.diagrams.net or in the draw.io desktop app:

1. **Deployment**: the browser and Postman on the client, the Express server (REST, GraphQL, Socket.IO, static files), and MongoDB, with the protocol on each connection.
2. **ER diagram**: Room, Slot, Student and Booking in crow's foot notation. A room has many slots, and Booking is the link table between Student and Slot (many-to-many).
3. **Sequence**: a student booking a slot, with an `alt` block for the normal case and the slot-full case.

## Question 3: REST API

All routes are under `/api/v1`.

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/rooms` | all rooms |
| GET | `/rooms/:roomCode` | one room |
| POST | `/rooms` | create a room |
| PUT | `/rooms/:roomCode` | replace name, building and seats (all three required) |
| PATCH | `/rooms/:roomCode` | change only the fields sent |
| DELETE | `/rooms/:roomCode` | delete the room and its slots (refused while a slot has bookings) |
| POST | `/slots` | create a slot `{ roomCode, date, startHour }`, seats are copied from the room |
| GET | `/slots/:id` | one slot |
| GET | `/slots` | filters `roomCode`, `date`, `hasSeats=true`, plus `page` and `limit` (default 10, max 100) |
| POST | `/students` | create a student `{ regNo, name, email }` |
| GET | `/students/:regNo` | one student |
| POST | `/students/:regNo/bookings` | book a slot `{ slotId }` |
| GET | `/students/:regNo/bookings` | the student's bookings with room name, date and start hour |
| DELETE | `/students/:regNo/bookings/:slotId` | cancel a booking |

Trying to change `roomCode` with PUT or PATCH gives `422 ROOMCODE_IMMUTABLE`. Sending the same code again is allowed.

### Status codes

| Code | When |
| --- | --- |
| 200 | normal reads and updates |
| 201 | something was created (room, slot, student, booking) |
| 204 | delete or cancel worked (empty body) |
| 400 | the request itself is broken: bad JSON, body that is not an object, an id that is not an ObjectId, bad `page`/`limit`/`date` in the query, missing `slotId` |
| 404 | the room, slot, student, booking or route does not exist |
| 409 | conflict: room/slot/student already exists, `SLOT_FULL`, `ALREADY_BOOKED`, deleting a room that still has bookings |
| 422 | the JSON is fine but the data breaks a rule: missing field, `startHour` 9, invalid email, seats below 1, changing `roomCode` |

### Booking rules

`bookSlot` in `services/bookingService.js` does these steps in order:

1. `slotId` must be a valid id (400).
2. The student and the slot must exist (404 `STUDENT_NOT_FOUND` / `SLOT_NOT_FOUND`).
3. The student must not already have this slot (409 `ALREADY_BOOKED`).
4. The seat is taken with a single update:

```js
Slot.findOneAndUpdate(
  { _id: slotId, $expr: { $lt: ['$booked', '$seats'] } },
  { $inc: { booked: 1 } },
  { returnDocument: 'after' },
);
```

If it returns `null`, there was no free seat, so the answer is 409 `SLOT_FULL`. MongoDB applies the filter and the increment as one operation, so when two students go for the last seat at the same moment only one update matches. I tested this by sending 8 booking requests at once for a 2-seat slot: 2 got 201, 6 got `SLOT_FULL`, and `booked` ended at 2.

There is also a unique index on `(student, slot)` in the Booking collection. If the same student sends two requests at once and both pass step 3, the second insert fails on that index. The seat it took is then given back and the answer is `ALREADY_BOOKED`.

Cancelling deletes the booking and decreases `booked` by one.

### Sample data and Postman

`npm run seed` clears the four collections and inserts 3 rooms, 11 slots and 3 students (including me). It also adds two bookings that fill the 8:00 slot of ROOM-03 (2 seats), so there is always a full slot for testing `SLOT_FULL`.

`postman/srb-api.postman_collection.json` has 40 requests in six folders, with both successful and failing cases. Each request has small tests that check the status code. Some requests save slot ids into collection variables for the later ones, so run `npm run seed` first and then run the collection in order (the Collection Runner works). I ran it with newman against a freshly seeded database and all 67 checks passed.

## Question 4: GraphQL

`POST /graphql` is served by Apollo Server on the same Express app.

```graphql
type Query {
  rooms: [Room!]!
  slots(roomCode: String, date: String): [Slot!]!
  student(regNo: String!): Student
}

type Mutation {
  bookSlot(regNo: String!, slotId: ID!): Booking!
  cancelBooking(regNo: String!, slotId: ID!): Boolean!
}
```

A `Student` has `bookings`, and each `Booking` has `roomName`, `date` and `startHour`. The resolvers in `graphql/resolvers.js` only call the service functions from Question 3 (`bookingService.bookSlot`, `cancelBooking`, `listBookings` and so on), so no rule is written twice. A booking made through GraphQL also sends the Socket.IO update, because that happens inside the service. Errors keep the same codes as REST, for example `errors[0].extensions.code` is `"SLOT_FULL"`.

`dashboard.graphql` gets a student's details and all of their bookings in one request. The variables are `{ "regNo": "FA23-BAI-058" }`.

**Why this is better than REST here.** With REST, the dashboard needs two round trips (`GET /students/:regNo` and then `GET /students/:regNo/bookings`), and each response has every field the server decided to return, whether the page needs it or not. With GraphQL the page sends one request and gets back exactly the fields it asked for, in the shape it will display. That means less waiting on a slow mobile connection and less data. Also, if the page later needs another field, such as the building name, only the query changes, not the server. The cost is that HTTP caching is harder, since everything is a POST to one URL, but caching is not needed in this assignment.

## Question 5: real-time board (Socket.IO)

Booking still happens through the API (REST or GraphQL). Socket.IO only pushes the changes to open pages.

- **board.html** shows the slots of one room, grouped by day, with seats left. The room comes from `?room=ROOM-01` or from the drop-down.
- When it connects, the page emits `join:room` with the room code. The server checks that the room exists, moves the socket into the Socket.IO room `room:ROOM-01`, and sends the current slots back in the acknowledgement.
- After a booking or cancellation, the service calls `realtime.slotUpdated(slot)`, which does `io.to('room:' + roomCode).emit('slot:updated', { slotId, seatsLeft })`. Only boards for that room receive it.
- **/admin namespace**: a middleware checks `socket.handshake.auth.adminKey` against `ADMIN_KEY` from `.env`. A wrong or missing key is refused with a message that the page shows ("Wrong admin key, connection refused" or "An admin key is required"). A connected admin emits `announce` with a message (max 280 characters), and every connected board shows it. `admin.html` is a small page for this.
- The page shows connected, disconnected or reconnecting in the header. Socket.IO reconnects on its own, and every time the `connect` event fires the page emits `join:room` again and redraws from the acknowledgement. So after a server restart the seats are correct without refreshing.
- Everything that came from users (room names, announcements, error messages) is put on the page with `textContent`, never `innerHTML`. An announcement like `<img src=x onerror=alert(1)>` shows up as plain text.

To test: open `board.html?room=ROOM-01` in two tabs and `board.html?room=ROOM-02` in a third. Book a ROOM-01 slot in Postman. Both ROOM-01 tabs update within a second (the changed row flashes yellow) and the ROOM-02 tab does not change.

## Decisions worth mentioning

- Slot dates are stored as `YYYY-MM-DD` strings. Filtering by `?date=` is then a simple equality, and time zones can't move a slot to the wrong day. The model checks that the date really exists, so 2026-02-31 is rejected.
- Changing a room's `seats` does not change slots that already exist, because the assignment says seats are copied when the slot is created.
- A room can only be deleted when none of its slots have bookings (otherwise 409). Its empty slots are deleted with it.
- Register numbers are stored in upper case, so `fa23-bai-058` and `FA23-BAI-058` are the same student.
