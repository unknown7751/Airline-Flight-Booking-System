/**
 * Seat Model - Manages seat data and availability
 */

import db from '../config/db.js';

class SeatModel {
  /**
   * Get all seats for a specific aircraft with their availability status
   * @param {number} aircraftId - Aircraft ID
   * @param {number} flightId - Optional flight ID to check seat availability for specific flight
   * @returns {Promise<Array>} Array of seat objects
   */
  static async getByAircraft(aircraftId, flightId = null) {
    try {
      const query = `
        SELECT 
          s.seat_id,
          s.aircraft_id,
          s.seat_number,
          s.class_type,
          s.status,
          CASE 
            WHEN t.ticket_id IS NOT NULL THEN 'OCCUPIED'
            ELSE s.status
          END AS availability_status
        FROM seat s
        LEFT JOIN (
          SELECT t.seat_id, t.ticket_id
          FROM TICKETS t
          WHERE t.flight_id = :flightId
            AND UPPER(t.status) NOT IN ('CANCELLED', 'CANCELED')
        ) t ON s.seat_id = t.seat_id
        WHERE s.aircraft_id = :aircraftId
        ORDER BY s.seat_number
      `;
      
      const binds = { aircraftId, flightId: flightId || null };
      const result = await db.execute(query, binds);
      
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching seats by aircraft:', error);
      throw error;
    }
  }

  /**
   * Get all seats for a specific flight with availability
   * @param {number} flightId - Flight ID
   * @returns {Promise<Array>} Array of seat objects with pricing
   */
  static async getByFlight(flightId) {
    try {
      const query = `
        SELECT 
          s.seat_id AS id,
          s.seat_number AS "seatNumber",
          s.class_type AS section,
          CASE 
            WHEN t.ticket_id IS NOT NULL THEN 0
            WHEN s.status = 'MAINTENANCE' THEN 0
            ELSE 1
          END AS "isAvailable",
          CASE 
            WHEN s.class_type = 'BUSINESS' THEN ROUND(f.price * 1.5, 2)
            WHEN s.class_type = 'FIRST_CLASS' THEN ROUND(f.price * 2.0, 2)
            ELSE f.price
          END AS price
        FROM seat s
        CROSS JOIN FLIGHTS f
        LEFT JOIN (
          SELECT t.seat_id, t.ticket_id
          FROM TICKETS t
          WHERE t.flight_id = :flightId
            AND UPPER(t.status) NOT IN ('CANCELLED', 'CANCELED')
        ) t ON s.seat_id = t.seat_id
        WHERE f.flight_id = :flightId
          AND s.aircraft_id = f.aircraft_id
        ORDER BY 
          CASE s.class_type
            WHEN 'FIRST_CLASS' THEN 1
            WHEN 'BUSINESS' THEN 2
            WHEN 'ECONOMY' THEN 3
          END,
          s.seat_number
      `;
      
      const binds = { flightId: parseInt(flightId) };
      const result = await db.execute(query, binds);
      
      console.log('Seats query result:', JSON.stringify(result.rows?.slice(0, 2), null, 2)); // Log first 2 seats
      
      // Convert section to lowercase for frontend compatibility and ensure price is a number
      const seats = (result.rows || []).map(seat => ({
        ...seat,
        section: seat.section ? seat.section.toLowerCase() : 'economy',
        price: Number(seat.price) || 0
      }));
      
      console.log('Processed seats:', JSON.stringify(seats.slice(0, 2), null, 2)); // Log first 2 processed seats
      
      return seats;
    } catch (error) {
      console.error('Error fetching seats by flight:', error);
      throw error;
    }
  }

  /**
   * Get seat by ID
   * @param {number} id - Seat ID
   * @returns {Promise<Object>} Seat object
   */
  static async getById(id) {
    try {
      const query = `
        SELECT 
          seat_id,
          aircraft_id,
          seat_number,
          class_type,
          status
        FROM seat
        WHERE seat_id = :id
      `;
      
      const binds = { id: parseInt(id) };
      const result = await db.execute(query, binds);
      
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching seat by ID:', error);
      throw error;
    }
  }
}

export default SeatModel;
