/**
 * Seat Controller
 */

import SeatModel from '../models/seat.model.js';

class SeatController {
  /**
   * Get seats for a specific flight
   * GET /api/flights/:flightId/seats
   */
  static async getByFlight(req, res, next) {
    try {
      const { flightId } = req.params;
      const seats = await SeatModel.getByFlight(flightId);
      
      res.json({
        success: true,
        count: seats.length,
        data: seats
      });
    } catch (error) {
      console.error('Error in getByFlight:', error);
      next(error);
    }
  }

  /**
   * Get seat by ID
   * GET /api/seats/:id
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const seat = await SeatModel.getById(id);
      
      if (!seat) {
        return res.status(404).json({
          success: false,
          message: 'Seat not found'
        });
      }
      
      res.json({
        success: true,
        data: seat
      });
    } catch (error) {
      console.error('Error in getById:', error);
      next(error);
    }
  }
}

export default SeatController;
