import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Smartphone,
  Banknote,
  IndianRupee,
  Heart,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { ServiceRequest } from "@/types";

type PaymentMethod = "card" | "upi" | "cash";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onPaid: (tip: number) => Promise<void>;
  request: ServiceRequest;
}

const TIP_OPTIONS = [0, 50, 100, 200, 500];

export function PaymentModal({
  open,
  onClose,
  onPaid,
  request,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const baseAmount = request.finalPrice || request.estimatedPrice || 0;
  const additionalFees = request.additionalFees || 0;
  const totalAmount = baseAmount + additionalFees + tipAmount;

  const handlePay = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      await onPaid(tipAmount);
      toast.success("Payment success! Mission Concluded. 🎉");
      onClose();
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md lg:max-w-2xl rounded-3xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 overflow-x-hidden overflow-y-auto">
        <div className="bg-slate-900 p-5 sm:p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-2xl z-999" />
          <DialogHeader>
            <DialogTitle className="text-white text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
              Settlement Authorization
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6 sm:mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                Amount Payable
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white">
                {formatCurrency(totalAmount)}
              </h2>
            </div>
            <button 
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="shrink-0 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all flex items-center gap-2 group"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-400">View Details</span>
              <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <AnimatePresence>
            {showBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 pt-6 border-t border-white/5 space-y-3"
              >
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Service Fee</span>
                  <span className="font-black text-slate-300">{formatCurrency(baseAmount)}</span>
                </div>
                {additionalFees > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">Additional Charges / Parts</span>
                    <span className="font-black text-blue-400">{formatCurrency(additionalFees)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">Gratuity / Tip</span>
                    <span className="font-black text-pink-400">{formatCurrency(tipAmount)}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 sm:p-8 space-y-7 sm:space-y-8">
          {/* Tipping Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Performance Bonus (Optional)
              </Label>
              <Heart
                className={`w-4 h-4 transition-all ${tipAmount > 0 ? "text-pink-500 fill-pink-500 scale-125" : "text-slate-300"}`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {TIP_OPTIONS.map((tip) => (
                <button
                  key={tip}
                  type="button"
                  onClick={() => {
                    setTipAmount(tip);
                    setIsCustomTip(false);
                  }}
                  className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black transition-all border-2 uppercase tracking-widest ${
                    tipAmount === tip && !isCustomTip
                      ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20"
                      : "bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-200"
                  }`}
                >
                  {tip === 0 ? "None" : `₹${tip}`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsCustomTip(true);
                  setTipAmount(0);
                }}
                className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black transition-all border-2 uppercase tracking-widest ${
                  isCustomTip
                    ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20"
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-200"
                }`}
              >
                Custom
              </button>
            </div>

            <AnimatePresence>
              {isCustomTip && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="relative mt-2">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                    <Input
                      type="number"
                      placeholder="Enter bonus amount"
                      className="pl-12 rounded-2xl bg-slate-50 border-slate-100 h-14 font-black text-lg focus:bg-white"
                      value={tipAmount === 0 && isCustomTip ? "" : tipAmount}
                      // @ts-expect-error - allow empty string
                      onChange={(e) => setTipAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Mission Settlement Terminal
            </Label>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                {
                  id: "card" as PaymentMethod,
                  label: "Card",
                  icon: CreditCard,
                },
                { id: "upi" as PaymentMethod, label: "UPI", icon: Smartphone },
                { id: "cash" as PaymentMethod, label: "Cash", icon: Banknote },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border-2 transition-all group ${
                    paymentMethod === method.id
                      ? "border-blue-600 bg-blue-50/50 shadow-inner"
                      : "border-slate-50 bg-slate-50 hover:border-slate-200 hover:bg-white"
                  }`}
                >
                  <method.icon
                    className={`w-7 h-7 transition-all ${paymentMethod === method.id ? "text-blue-600 scale-110" : "text-slate-400 group-hover:text-slate-600"}`}
                  />
                  <span
                    className={`text-[9px] font-black uppercase tracking-[0.2em] ${paymentMethod === method.id ? "text-blue-700" : "text-slate-500"}`}
                  >
                    {method.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Method Specifics */}
          <div className="min-h-[140px] flex flex-col justify-center">
            {paymentMethod === "card" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <Input
                  placeholder="Card Number"
                  className="rounded-2xl bg-slate-50 border-slate-100 h-14 font-bold"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="MM/YY"
                    className="rounded-2xl bg-slate-50 border-slate-100 h-14 font-bold text-center"
                  />
                  <Input
                    placeholder="CVV"
                    type="password"
                    className="rounded-2xl bg-slate-50 border-slate-100 h-14 font-bold text-center"
                  />
                </div>
              </motion.div>
            )}

            {paymentMethod === "upi" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Input
                  placeholder="vpa@upi"
                  className="rounded-2xl bg-slate-50 border-slate-100 h-14 font-black tracking-widest text-lg px-6"
                />
                <p className="text-[10px] text-blue-600 font-black mt-3 ml-1 tracking-[0.2em] uppercase">
                  Authorization request will be pushed
                </p>
              </motion.div>
            )}

            {paymentMethod === "cash" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 text-center"
              >
                <Banknote className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] mb-1">
                  Cash Settlement Required
                </p>
                <p className="text-xl font-black text-emerald-900 tracking-tighter">
                  {formatCurrency(totalAmount)}
                </p>
              </motion.div>
            )}
          </div>

          <Button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full bg-blue-600 hover:bg-black text-white h-14 sm:h-18 rounded-[2rem] font-black shadow-2xl shadow-blue-600/20 group transform active:scale-[0.98] transition-all"
          >
            {isProcessing ? (
              <span className="flex items-center gap-3">
                <motion.div
                  className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <span className="uppercase tracking-widest text-sm">Authorizing Mission End...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
                Authorize {formatCurrency(totalAmount)}
                <IndianRupee className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
