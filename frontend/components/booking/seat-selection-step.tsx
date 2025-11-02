"use client"

import { useState, useEffect } from "react"
import type { Seat } from "@/types/booking"
import { SeatMap } from "./seat-map"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"

interface SeatSelectionStepProps {
  selectedSeats: Seat[]
  onToggleSeat: (seat: Seat) => void
  onNext: () => void
  onPrevious: () => void
  flightId?: string // Flight ID to fetch seat availability
}

export function SeatSelectionStep({ selectedSeats, onToggleSeat, onNext, onPrevious, flightId }: SeatSelectionStepProps) {
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + (Number(seat.price) || 0), 0)

  useEffect(() => {
    const fetchSeats = async () => {
      if (!flightId) {
        setError("Flight ID is required")
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        const response: any = await api.flights.getSeats(flightId)
        setSeats(response.data || [])
      } catch (error) {
        console.error("Error fetching seats:", error)
        setError("Failed to load seats. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    
    fetchSeats()
  }, [flightId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading seats...</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={onPrevious} className="mt-4">Go Back</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SeatMap seats={seats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />

      {selectedSeats.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Selected Seats</p>
              <p className="font-semibold">
                {selectedSeats.map((s) => s.seatNumber).join(", ")} - ${totalPrice.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between gap-3 pt-6">
        <Button variant="outline" onClick={onPrevious}>
          Back
        </Button>
        <Button onClick={onNext} disabled={selectedSeats.length === 0}>
          Next: Review Booking
        </Button>
      </div>
    </div>
  )
}
