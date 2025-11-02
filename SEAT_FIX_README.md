# Seat Logic Fix - Implementation Guide

## Problem
Flights were showing **0 available seats** because the seat logic wasn't properly connected to individual flights and their aircraft capacity.

## Root Causes Identified

1. **No automatic seat initialization**: When flights were created, `available_seats` was manually set or left as 0
2. **Seats tied to aircraft, not flights**: The SEAT table links to AIRCRAFT, not individual FLIGHTS
3. **Missing trigger**: No database trigger to auto-populate `available_seats` from aircraft capacity
4. **Search issue**: Flight search was only matching exact city names, not airport codes

## Solutions Implemented

### 1. Database Trigger (SQL)
**File**: `sql/airline_booking_unified.sql`

Added trigger `trg_flights_init_seats` that automatically:
- Sets `available_seats` = `aircraft.total_seats` when a flight is created
- Only triggers if `available_seats` is NULL or 0
- Handles cases where aircraft_id is missing

```sql
CREATE OR REPLACE TRIGGER trg_flights_init_seats
BEFORE INSERT ON FLIGHTS FOR EACH ROW
DECLARE
  v_total_seats NUMBER;
BEGIN
  IF :NEW.aircraft_id IS NOT NULL AND (:NEW.available_seats IS NULL OR :NEW.available_seats = 0) THEN
    SELECT total_seats INTO v_total_seats
    FROM aircraft WHERE aircraft_id = :NEW.aircraft_id;
    :NEW.available_seats := v_total_seats;
  END IF;
END;
```

### 2. Updated Flight Inserts (SQL)
**File**: `sql/airline_booking_unified.sql`

- Removed hardcoded `available_seats` values from INSERT statements
- Let the trigger handle seat initialization
- Changed status to uppercase 'SCHEDULED' for consistency
- Used proper TIMESTAMP format

### 3. Backend Model Fix
**File**: `backend/src/models/flight.model.js`

#### a) Updated `create()` method:
- Removed `available_seats` from INSERT statement
- Let DB trigger handle seat initialization
- Cleaner code, less prone to errors

#### b) Enhanced `search()` method:
- **Added flexible matching**: Now accepts both airport codes (DEL, BOM) AND city names (Delhi, Mumbai)
- **Added seat availability check**: Only returns flights with `available_seats > 0`
- **Includes available_seats in results**: Frontend can display seat availability

```javascript
WHERE (UPPER(ao.code) = UPPER(:origin) OR UPPER(ao.city) LIKE '%' || UPPER(:origin) || '%')
  AND (UPPER(ad.code) = UPPER(:destination) OR UPPER(ad.city) LIKE '%' || UPPER(:destination) || '%')
  AND UPPER(f.status) = 'SCHEDULED'
  AND f.available_seats > 0
```

### 4. Fix Script for Existing Data
**File**: `sql/fix_available_seats.sql`

Run this to fix existing flights that have 0 or incorrect available_seats:
- Calculates: `available_seats = aircraft.total_seats - booked_tickets`
- Updates all flights in one go
- Shows verification report

## How to Apply the Fixes

### Step 1: Update the Database Schema
```bash
# From your Oracle SQL client (SQL*Plus, SQL Developer, etc.)
sqlplus username/password@database

@sql/airline_booking_unified.sql
```

This will:
- Create the new trigger
- Drop and recreate all tables (if running full script)
- Insert sample data with proper seat initialization

### Step 2: Fix Existing Flight Data
If you already have flights in your database:
```sql
@sql/fix_available_seats.sql
```

This will update all existing flights to have correct `available_seats` values.

### Step 3: Restart Backend Server
```bash
cd backend
npm run dev
```

The backend changes will automatically be loaded.

### Step 4: Test the Search
Try searching for:
- **By Code**: From: DEL, To: BOM
- **By City**: From: Delhi, To: Mumbai
- **Partial match**: From: Del, To: Mum

All should work now!

## Verification

### Check Database
```sql
-- View all flights with seat information
SELECT 
  f.flight_id,
  f.flight_number,
  f.status,
  a.aircraft_model,
  a.total_seats,
  f.available_seats,
  (a.total_seats - f.available_seats) AS booked_seats
FROM FLIGHTS f
LEFT JOIN AIRCRAFT a ON f.aircraft_id = a.aircraft_id;
```

### Expected Output
```
FLIGHT_ID  FLIGHT_NUMBER  STATUS     AIRCRAFT_MODEL      TOTAL_SEATS  AVAILABLE_SEATS  BOOKED_SEATS
---------  -------------  ---------  ------------------  -----------  ---------------  ------------
10000      6E-204         SCHEDULED  Airbus A320neo      180          179              1
10001      AI-803         SCHEDULED  Boeing 787-8        256          255              1
10002      UK-945         SCHEDULED  Airbus A321         232          232              0
```

### Test Search API
```bash
# Test with airport codes
curl "http://localhost:3000/api/flights/search?origin=DEL&destination=BOM&departureDate=2025-11-15"

# Test with city names
curl "http://localhost:3000/api/flights/search?origin=Delhi&destination=Mumbai&departureDate=2025-11-15"
```

## How It Works Now

### Creating a New Flight
1. Admin/System inserts flight with `aircraft_id`
2. **Trigger fires automatically**
3. Trigger looks up `aircraft.total_seats`
4. Sets `flight.available_seats = total_seats`
5. Flight is ready with proper seat count

### Booking a Ticket
1. User books a ticket
2. Backend creates TICKET record
3. Backend decrements `FLIGHTS.available_seats` by 1
4. Seat count stays accurate

### Searching for Flights
1. User enters "DEL" or "Delhi" as origin
2. Backend searches: `code = 'DEL' OR city LIKE '%Delhi%'`
3. Returns only flights with `available_seats > 0`
4. User sees available seat count in search results

## Benefits

✅ **Automatic**: No manual seat management needed
✅ **Accurate**: Always reflects aircraft capacity
✅ **Real-time**: Updates with each booking/cancellation
✅ **Flexible**: Search works with codes or city names
✅ **Reliable**: Database enforces constraints

## Aircraft in System

| ID | Model | Registration | Total Seats | Economy | Business | First Class |
|----|-------|--------------|-------------|---------|----------|-------------|
| 1  | Airbus A320neo | VT-IZI | 180 | 180 | 0 | 0 |
| 2  | Boeing 787-8 | VT-ANP | 256 | 238 | 18 | 0 |
| 3  | Airbus A321 | VT-TVA | 232 | 220 | 12 | 0 |

## Sample Flights

| ID | Number | Route | Aircraft | Departure | Available Seats |
|----|--------|-------|----------|-----------|-----------------|
| 10000 | 6E-204 | BOM→DEL | Airbus A320neo | 2025-11-15 08:00 | 180 (initially) |
| 10001 | AI-803 | DEL→BLR | Boeing 787-8 | 2025-11-16 12:30 | 256 (initially) |
| 10002 | UK-945 | BLR→BOM | Airbus A321 | 2025-11-17 18:00 | 232 (initially) |

## Troubleshooting

### Issue: Still showing 0 seats
**Solution**: Run `sql/fix_available_seats.sql` to update existing flights

### Issue: Search returns no results
**Possible causes**:
1. Check if flights exist: `SELECT * FROM FLIGHTS;`
2. Check airport codes: `SELECT airport_id, code, city FROM AIRPORTS;`
3. Check status: Make sure flights have status = 'SCHEDULED' (uppercase)
4. Check date: Verify departure_time matches your search date

### Issue: Trigger not working
**Solution**: Verify trigger exists:
```sql
SELECT trigger_name, status FROM user_triggers WHERE trigger_name = 'TRG_FLIGHTS_INIT_SEATS';
```
If status is 'DISABLED', enable it:
```sql
ALTER TRIGGER trg_flights_init_seats ENABLE;
```

## Future Enhancements

Consider implementing:
1. **Seat class tracking**: Separate available_seats by class (economy/business/first)
2. **Overbooking**: Allow configurable overbooking percentage
3. **Seat hold**: Temporary reservation during booking process
4. **Seat map integration**: Link SEAT table records to specific flights
5. **Real-time updates**: WebSocket notifications for seat availability changes

## Notes

- The SEAT table (seat_id, aircraft_id, seat_number, class_type) defines physical seats on aircraft
- For per-flight seat assignment, you'd need a FLIGHT_SEATS join table
- Current implementation uses simple counter (available_seats) which is efficient for basic booking
- For complex seat selection UI, consider implementing FLIGHT_SEATS mapping

## Contact

For issues or questions about this implementation, refer to:
- SQL Schema: `sql/airline_booking_unified.sql`
- Backend Model: `backend/src/models/flight.model.js`
- Fix Script: `sql/fix_available_seats.sql`
