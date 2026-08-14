import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Star, Wifi, Phone, Navigation, Clock3 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { db } from '@/config/firebase';
import { UserProfile } from '@/types';
import { calculateDistance, getServiceLabel } from '@/lib/utils';
import { useGeolocation } from '@/hooks/useGeolocation';

interface ProviderWithDistance extends UserProfile {
  distance?: number;
}

export default function NearbyProviders() {
  const { lat, lng, loading: geoLoading, error: geoError, getCurrentLocation } = useGeolocation();
  const [providers, setProviders] = useState<ProviderWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'provider'),
        where('isOnline', '==', true),
        where('isVerified', '==', true)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() } as ProviderWithDistance));
      setProviders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate distances when location is available
  const providersWithDist: ProviderWithDistance[] = providers.map(p => ({
    ...p,
    distance: (lat && lng && p.location)
      ? calculateDistance(lat, lng, p.location.lat, p.location.lng)
      : undefined,
  })).sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  // Get unique service types from providers
  const allServiceTypes = Array.from(
    new Set(providers.flatMap(p => p.serviceTypes || []))
  );

  const filtered = selectedServiceType === 'all'
    ? providersWithDist
    : providersWithDist.filter(p => p.serviceTypes?.includes(selectedServiceType as never));

  return (
    <CustomerLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nearby Providers</h1>
          <p className="text-gray-500 mt-1">See available service providers near you and their ratings</p>
        </div>

        {/* Location Status */}
        {geoError && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Location Not Available</p>
              <p className="text-xs text-amber-600 mt-1">{geoError}</p>
              <Button size="sm" variant="outline" onClick={getCurrentLocation} className="mt-2 border-amber-300 text-amber-700">
                Retry Location
              </Button>
            </div>
          </div>
        )}

        {geoLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-700">Getting your location for accurate distances...</p>
          </div>
        )}

        {/* Service Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setSelectedServiceType('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedServiceType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Services
          </button>
          {allServiceTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedServiceType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                selectedServiceType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'jumpStart' ? 'Jump Start' :
               type === 'fuelDelivery' ? 'Fuel Delivery' :
               type === 'flatTire' ? 'Tyre puncture' : getServiceLabel(type as any)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSpinner text="Finding nearby providers..." />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wifi className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No Providers Online</h3>
            <p className="text-gray-400 text-sm mt-2">No verified providers are currently available in your area</p>
            <Button variant="outline" onClick={fetchProviders} className="mt-4">Refresh</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((provider, idx) => (
              <motion.div
                key={provider.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {provider.fullName?.charAt(0) || 'P'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{provider.fullName}</p>
                      <p className="text-xs text-gray-500">{provider.companyName || 'Independent Provider'}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          provider.totalJobs && provider.totalJobs > 0 && i < Math.round(provider.rating || 0)
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-gray-200 fill-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {(!provider.totalJobs || provider.totalJobs === 0) ? 'N/A' : (provider.rating || 0.0).toFixed(1)}
                  </span>
                  {provider.totalJobs !== undefined && provider.totalJobs > 0 && (
                    <span className="text-xs text-gray-400">({provider.totalJobs} jobs)</span>
                  )}
                </div>

                {/* Services */}
                {provider.serviceTypes && provider.serviceTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {provider.serviceTypes.map(type => (
                      <span key={type} className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">
                        <IconRenderer name={
                          type === 'towing' ? 'Truck' :
                          type === 'jumpStart' ? 'BatteryCharging' :
                          type === 'fuelDelivery' ? 'Fuel' :
                          type === 'flatTire' ? 'CircleDot' :
                          type === 'lockout' ? 'Key' : 'Wrench'
                        } size={12} />
                        {type === 'jumpStart' ? 'Jump Start' :
                         type === 'fuelDelivery' ? 'Fuel' :
                         getServiceLabel(type as any)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Distance & Radius */}
                <div className="space-y-1.5 mb-3 text-xs text-slate-500">
                  {provider.distance !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        {provider.distance < 1
                          ? `${(provider.distance * 1000).toFixed(0)}m away`
                          : `${provider.distance.toFixed(1)} km away`}
                      </span>
                      <span className="text-slate-400 font-medium ml-1">
                        ~{Math.ceil(provider.distance * 3)} min arrival
                      </span>
                    </div>
                  )}
                  {provider.serviceRadiusKm && (
                    <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider ml-5">
                      Serves up to {provider.serviceRadiusKm} km radius
                    </p>
                  )}
                </div>

                {/* Additional Info: City, Hours */}
                <div className="space-y-1.5 mb-4 pt-3 border-t border-slate-50 text-xs text-slate-600">
                  {(provider.city || provider.state) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{[provider.city, provider.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {provider.businessHours && (
                    <div className="flex items-center gap-1.5">
                      <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{provider.businessHours}</span>
                    </div>
                  )}
                </div>

                {/* Vehicle / Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
                  <div className="flex items-center gap-2 ml-auto">
                    <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs font-bold">
                      <Link to={`/customer/new-request?${selectedServiceType !== 'all' ? `service=${selectedServiceType}&` : ''}providerId=${provider.uid}`}>
                        Request Help
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </CustomerLayout>
  );
}





