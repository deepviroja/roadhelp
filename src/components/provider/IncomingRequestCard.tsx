import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, XCircle, Navigation, Map, SendHorizonal, Clock, IndianRupee, MessageSquare, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { ServiceRequest } from '@/types';
import { getServiceLabel, calculateDistance, formatCurrency } from '@/lib/utils';
import { SERVICE_MAP } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { ProviderLocationMap } from '@/components/map/ProviderLocationMap';
import { toast } from 'sonner';

interface IncomingRequestCardProps {
  request: ServiceRequest;
  onDecline: () => void;
  isAccepting?: boolean;
}

export function IncomingRequestCard({ request, onDecline, isAccepting }: IncomingRequestCardProps) {
  const service = SERVICE_MAP[request.serviceType];
  const serviceIcon = request.serviceIcon ?? service?.icon ?? 'Wrench';
  const { profile } = useAuth();
  const [showMap, setShowMap] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [offerSent, setOfferSent] = useState(false);

  const [quote, setQuote] = useState<string>(String(request.estimatedPrice || ''));
  const [eta, setEta] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const distance = profile?.location
    ? calculateDistance(
        profile.location.lat,
        profile.location.lng,
        request.customerLocation.lat,
        request.customerLocation.lng
      )
    : null;

  const estimatedEta = distance != null ? Math.ceil(distance * 3) : null;

  const handleSendOffer = async () => {
    if (!quote || Number(quote) <= 0) {
      toast.error('Please enter a valid price quote');
      return;
    }
    if (!eta || Number(eta) <= 0) {
      toast.error('Please enter estimated arrival time');
      return;
    }

    setIsSending(true);
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${request.id}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          estimatedPrice: Number(quote),
          estimatedTime: Number(eta),
          message: message.trim(),
          distanceKm: distance != null ? Number(distance.toFixed(1)) : null,
          serviceType: request.serviceType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send offer');
      setOfferSent(true);
      toast.success('Offer sent! Customer will review your bid.');
    } catch (err: any) {
      toast.error(err.message || 'Could not send offer');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl border-2 shadow-md overflow-hidden transition-all ${
        request.isEmergency 
          ? 'border-red-500 shadow-red-500/10 shadow-lg' 
          : request.directInvite 
            ? 'border-purple-500 shadow-purple-500/5 shadow-md' 
            : offerSent 
              ? 'border-green-400' 
              : 'border-orange-200'
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        request.isEmergency 
          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500' 
          : request.directInvite
            ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 animate-gradient-xy'
            : 'bg-gradient-to-r from-orange-500 to-amber-500'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xl text-white"><IconRenderer name={serviceIcon} size={20} /></span>
          <div>
            <span className="text-white font-semibold text-sm flex items-center gap-1.5">
              {request.serviceName ?? getServiceLabel(request.serviceType)}
              {request.isEmergency && (
                <span className="bg-white text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">SOS</span>
              )}
              {request.directInvite && (
                <span className="bg-white text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Direct</span>
              )}
            </span>
            <p className={`${request.isEmergency ? 'text-red-100' : request.directInvite ? 'text-indigo-100' : 'text-orange-100'} text-xs font-bold`}>
              {request.isEmergency 
                ? 'URGENT — Emergency Request' 
                : request.directInvite 
                  ? '⚡ Direct Customer Request' 
                  : 'New Request!'}
            </p>
          </div>
        </div>
        <Badge className={`${
          request.isEmergency 
            ? 'bg-white text-red-600' 
            : request.directInvite
              ? 'bg-white text-indigo-600 font-bold'
              : 'bg-white/20 text-white'
        } border-0`}>
          Est. {formatCurrency(request.estimatedPrice)}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        {/* Customer Info */}
        <div>
          <p className="font-semibold text-gray-900">{request.customerName}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-sm text-gray-500">{request.customerPhone}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600 line-clamp-2">{request.customerLocation?.address || 'No address provided'}</p>
        </div>

        {distance !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-blue-600 font-semibold">
                {distance.toFixed(1)} km away
                {estimatedEta && <span className="text-slate-400 font-normal ml-2">~{estimatedEta} min</span>}
              </p>
            </div>
            {profile?.location && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:bg-blue-50 h-8 font-bold gap-1 rounded-lg"
                onClick={() => setShowMap(!showMap)}
              >
                <Map className="w-3.5 h-3.5" />
                {showMap ? 'Hide Route' : 'Show Route'}
              </Button>
            )}
          </div>
        )}

        {showMap && profile?.location && (
          <div className="h-52 w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
            <ProviderLocationMap
              providerLocation={profile.location}
              customerLocation={request.customerLocation}
            />
          </div>
        )}

        <p className="text-sm text-gray-500 italic line-clamp-2">"{request.description}"</p>

        {/* Offer Sent State */}
        {offerSent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-center">
            <p className="text-sm font-black text-green-800">✅ Offer Submitted!</p>
            <p className="text-xs text-green-600 font-semibold">
              Your quote of {formatCurrency(Number(quote))} has been sent. The customer will review all offers and choose the best one.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setOfferSent(false); setShowOfferForm(true); }}
              className="text-xs text-green-700 hover:bg-green-100 gap-1 h-8"
            >
              <Edit3 className="w-3 h-3" /> Edit Offer
            </Button>
          </div>
        ) : (
          <>
            {/* Offer Form */}
            <AnimatePresence>
              {showOfferForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Offer</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" /> Price Quote *
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder={String(request.estimatedPrice || '500')}
                          value={quote}
                          onChange={(e) => setQuote(e.target.value)}
                          className="h-10 rounded-xl font-bold text-slate-900 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ETA (minutes) *
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder={estimatedEta ? String(estimatedEta) : '15'}
                          value={eta}
                          onChange={(e) => setEta(e.target.value)}
                          className="h-10 rounded-xl font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Message (optional)
                      </Label>
                      <Input
                        placeholder="e.g. I'm on my way, will arrive soon!"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="h-10 rounded-xl font-semibold text-slate-900 bg-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOfferForm(false)}
                        className="flex-1 h-10 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendOffer}
                        disabled={isSending}
                        className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs gap-1"
                      >
                        <SendHorizonal className="w-3.5 h-3.5" />
                        {isSending ? 'Sending...' : 'Send Offer'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            {!showOfferForm && (
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-11 font-bold text-xs"
                  onClick={onDecline}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Skip
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-black text-xs gap-1.5"
                  onClick={() => setShowOfferForm(true)}
                  disabled={isAccepting}
                >
                  <SendHorizonal className="w-4 h-4" />
                  Send Offer
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
