"use client"

import { useState } from "react"
import { Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FeedbackCardProps {
    onFeedbackSubmit: (rating: number, comment: string) => void
    onBack: () => void
    title?: string
    description?: string
    submitButtonText?: string
    backButtonText?: string
    isSubmitting?: boolean
}

export function FeedbackCard({ 
    onFeedbackSubmit, 
    onBack,
    title = "Lascia la Tua Opinione",
    description = "Dicci cosa pensi della nostra associazione",
    submitButtonText = "Invia Feedback ed Esci",
    backButtonText = "Torna Indietro",
    isSubmitting = false 
}: FeedbackCardProps) {
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState("")

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl">{title}</CardTitle>
                <CardDescription className="text-lg pt-2">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Valuta la tua esperienza.</Label>
                    <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn(
                                    "h-8 w-8 cursor-pointer transition-colors",
                                    star <= (hoverRating || rating)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-muted-foreground/50"
                                )}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                            />
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="comment">Il tuo commento.</Label>
                    <Textarea
                        id="comment"
                        placeholder="Scrivi qui il tuo feedback..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
                        {backButtonText}
                    </Button>
                    <Button 
                        onClick={() => onFeedbackSubmit(rating, comment)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                        {submitButtonText}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
