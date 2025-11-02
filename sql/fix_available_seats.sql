-- ============================================
-- Fix Available Seats for Existing Flights
-- ============================================
-- This script updates all existing flights to have proper available_seats
-- based on their aircraft's total_seats minus any booked tickets

SET SERVEROUTPUT ON;

PROMPT 'Fixing available_seats for existing flights...';

BEGIN
  -- Update each flight's available_seats based on aircraft total_seats minus booked tickets
  FOR flight_rec IN (
    SELECT f.flight_id, f.aircraft_id, a.total_seats
    FROM FLIGHTS f
    LEFT JOIN AIRCRAFT a ON f.aircraft_id = a.aircraft_id
    WHERE f.aircraft_id IS NOT NULL
  ) LOOP
    -- Calculate booked seats for this flight
    DECLARE
      v_booked_seats NUMBER := 0;
      v_available NUMBER;
    BEGIN
      SELECT NVL(COUNT(*), 0)
      INTO v_booked_seats
      FROM TICKETS t
      WHERE t.flight_id = flight_rec.flight_id
        AND UPPER(t.status) NOT IN ('CANCELLED', 'CANCELED');
      
      -- Calculate available seats
      v_available := flight_rec.total_seats - v_booked_seats;
      
      -- Update the flight
      UPDATE FLIGHTS
      SET available_seats = v_available
      WHERE flight_id = flight_rec.flight_id;
      
      DBMS_OUTPUT.PUT_LINE('Flight ' || flight_rec.flight_id || ': Total=' || flight_rec.total_seats || ', Booked=' || v_booked_seats || ', Available=' || v_available);
    END;
  END LOOP;
  
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Available seats updated successfully for all flights.');
  
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Error updating available_seats: ' || SQLERRM);
    ROLLBACK;
END;
/

-- Verify the results
PROMPT '';
PROMPT 'Verification - Flight seat status:';
SELECT 
  f.flight_id,
  f.flight_number,
  f.status,
  a.aircraft_model,
  a.total_seats,
  f.available_seats,
  (a.total_seats - f.available_seats) AS booked_seats
FROM FLIGHTS f
LEFT JOIN AIRCRAFT a ON f.aircraft_id = a.aircraft_id
ORDER BY f.flight_id;

PROMPT '';
PROMPT 'Fix completed!';
