import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => Promise<void>;
  providerName: string;
}

export function RatingModal({ open, onClose, onSubmit, providerName }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.warning('Please select a rating');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(rating, review);
      toast.success('Thank you for your feedback!');
      onClose();
    } catch {
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-2xl p-8 scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-4">How was your experience with <strong>{providerName}</strong>?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {rating === 0 ? 'Click to rate' : rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent!'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review">Leave a review (optional)</Label>
            <Textarea
              id="review"
              placeholder="Tell us about your experience..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
