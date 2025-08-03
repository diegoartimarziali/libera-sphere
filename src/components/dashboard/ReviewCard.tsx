
"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

export interface Review {
    id: string;
    rating: number;
    comment: string;
    discipline: string;
    submittedAt: Timestamp;
}

interface ReviewCardProps {
    review: Review;
}

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`h-5 w-5 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
            />
        ))}
    </div>
);

export function ReviewCard({ review }: ReviewCardProps) {
    const timeAgo = review.submittedAt
        ? formatDistanceToNow(review.submittedAt.toDate(), { addSuffix: true, locale: it })
        : "Data sconosciuta";

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                   <StarRating rating={review.rating} />
                   <Badge variant="secondary">{review.discipline}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                {review.comment ? (
                     <p className="text-muted-foreground italic">"{review.comment}"</p>
                ) : (
                    <p className="text-muted-foreground italic">Nessun commento lasciato.</p>
                )}
            </CardContent>
            <CardFooter>
                 <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1.5" />
                    <span>Inviato {timeAgo}</span>
                </div>
            </CardFooter>
        </Card>
    );
}

    