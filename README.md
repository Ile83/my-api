# Meeting Room Booking API (TypeScript + Express)

A simple REST API for booking meeting rooms with:
- In-memory storage (data resets on restart)
- Zod request validation
- Overlap prevention (half-open intervals: [start, end))
- Basic error handling

## Requirements
- Node.js 18+ recommended

## Install
```bash
npm install

npm run dev

npm run build

npm start




CMD:

list bookings

alpha being the room name

curl -s "http://localhost:3000/rooms/alpha/bookings"

Create a booking:

curl -s -X POST "http://localhost:3000/rooms/alpha/bookings" ^
  -H "Content-Type: application/json" ^
  -d "{\"startTime\":\"2026-02-01T10:00:00.000Z\",\"endTime\":\"2026-02-01T11:00:00.000Z\"}"


Delete a booking: 

curl -i -X DELETE "http://localhost:3000/rooms/alpha/bookings/<bookingId>"


Korjattu mutexin muistivuoto ja tehty in-memory store turvallisemmaksi

- Korjattu KeyedMutexin siivouslogiikka, joka aiheutti muistivuodon
- Poistettu julkisesta API:sta ei-atomiset insert/remove-metodit
- Lisätty atomiset ja säieturvalliset kirjoitusoperaatiot
- Tehostettu hakuja Map-pohjaisella bookingId-indeksillä (O(1))
- Estetty turha huoneiden luonti lukuoperaatioissa
- Lisätty valinnaiset kapasiteettirajat muistinkäytön hallintaan
