import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Smartphone,
  Banknote,
  IndianRupee,
  Heart,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

  // Credit Card States & Errors
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  const [cardError, setCardError] = useState(false);
  const [expiryError, setExpiryError] = useState(false);
  const [cvvError, setCvvError] = useState(false);
  const [nameError, setNameError] = useState(false);

  // UPI State & Error
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState(false);

  // Cash State & Error
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [cashConfirmedError, setCashConfirmedError] = useState(false);
  const [showBreakdownMobile, setShowBreakdownMobile] = useState(false);

  const baseAmount = request.finalPrice || request.estimatedPrice || 0;
  const additionalFees = request.additionalFees || 0;
  const totalAmount = baseAmount + additionalFees + tipAmount;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCardNumber(value);
    setCardError(false);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    setCardExpiry(value.slice(0, 5));
    setExpiryError(false);
  };

  const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCardCvv(value);
    setCvvError(false);
  };

  const handlePay = async () => {
    // Reset errors
    setCardError(false);
    setExpiryError(false);
    setCvvError(false);
    setNameError(false);
    setUpiError(false);
    setCashConfirmedError(false);

    if (paymentMethod === "card") {
      let valid = true;
      if (cardNumber.length !== 16) {
        setCardError(true);
        valid = false;
      }
      if (cardExpiry.length !== 5 || !cardExpiry.includes('/')) {
        setExpiryError(true);
        valid = false;
      }
      if (cardCvv.length !== 3) {
        setCvvError(true);
        valid = false;
      }
      if (!cardName.trim()) {
        setNameError(true);
        valid = false;
      }
      if (!valid) {
        toast.error("Please fill in card credentials completely.");
        return;
      }
    } else if (paymentMethod === "upi") {
      if (!upiId.trim() || !upiId.includes('@')) {
        setUpiError(true);
        toast.error("Please enter a valid UPI VPA (e.g. name@upi).");
        return;
      }
    } else if (paymentMethod === "cash") {
      if (!cashConfirmed) {
        setCashConfirmedError(true);
        toast.error("Please check the box to confirm cash was paid.");
        return;
      }
    }

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
      <DialogContent className="max-w-md lg:max-w-4xl rounded-[2rem] sm:rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-slate-50">
        <div className="grid grid-cols-1 lg:grid-cols-12 w-full">
          
          {/* Left Column: Summary Panel */}
          <div className="lg:col-span-5 bg-slate-950 p-5 sm:p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden lg:min-h-[500px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-20 -mt-20 blur-3xl z-0" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-cyan-500/10 rounded-full -ml-16 -mb-16 blur-2xl z-0" />
            
            <div className="relative z-10 flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-start gap-4 w-full">
              <DialogHeader className="space-y-0 text-left">
                <DialogTitle className="text-white text-base sm:text-xl font-black tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-blue-500 animate-pulse" />
                  </div>
                  <span className="hidden sm:inline">Secure Payout</span>
                  <span className="inline sm:hidden">Pay</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-0 lg:space-y-1 text-right lg:text-left lg:mt-8">
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] hidden lg:block">
                  Total Amount Payable
                </p>
                <h2 className="text-xl sm:text-2xl lg:text-4xl font-black tracking-tighter text-cyan-400 lg:text-white">
                  {formatCurrency(totalAmount)}
                </h2>
              </div>
            </div>

            {/* Mobile-only Bill Details Toggle */}
            <div className="flex lg:hidden justify-between items-center mt-4 pt-4 border-t border-white/5 relative z-10 w-full">
              <button
                type="button"
                onClick={() => setShowBreakdownMobile(!showBreakdownMobile)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showBreakdownMobile ? 'Hide Details' : 'View Bill Details'}</span>
                <span className="text-[9px] font-bold text-slate-500">{showBreakdownMobile ? '▲' : '▼'}</span>
              </button>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Secured</span>
            </div>

            {/* Itemized Invoice Receipt */}
            <div className={`${
              showBreakdownMobile ? 'block' : 'hidden lg:block'
            } mt-4 lg:mt-10 pt-4 lg:pt-8 border-t border-white/5 space-y-3 relative z-10 w-full`}>
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Base Service Amount</span>
                <span>{formatCurrency(baseAmount)}</span>
              </div>
              {additionalFees > 0 && (
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Additional Charges / Parts</span>
                  <span className="text-blue-400 font-bold">+{formatCurrency(additionalFees)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-xs font-semibold text-pink-400">
                  <span>Gratuity / Tip</span>
                  <span className="font-bold">+{formatCurrency(tipAmount)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between items-center text-xs font-black text-white uppercase tracking-wider">
                <span>Total bill</span>
                <span className="text-sm lg:text-lg font-black text-cyan-400">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Payment Flow */}
          <div className="lg:col-span-7  p-6 sm:p-10 sm:pb-15 pb-15 space-y-8 bg-white max-h-[85vh] lg:max-h-[640px] overflow-y-auto scrollbar-thin">
            
            {/* Gratuity / Performance Tipping */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tip Your Helper (Optional)
                </Label>
                <Heart
                  className={`w-4 h-4 transition-transform duration-300 ${
                    tipAmount > 0 ? "text-pink-500 fill-pink-500 scale-125 animate-ping-once" : "text-slate-350"
                  }`}
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
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all border-2 uppercase tracking-widest cursor-pointer ${
                      tipAmount === tip && !isCustomTip
                        ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/15"
                        : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-white"
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
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all border-2 uppercase tracking-widest cursor-pointer ${
                    isCustomTip
                      ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/15"
                      : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-white"
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
                        min="0"
                        placeholder="Enter bonus amount"
                        className="pl-12 rounded-xl bg-slate-50 border-slate-100 h-12 font-black text-base focus:bg-white focus:border-slate-300 focus:outline-none"
                        value={tipAmount === 0 && isCustomTip ? "" : tipAmount}
                        // @ts-expect-error - allow empty string
                        onChange={(e) => setTipAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Select Payment Option
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "card" as PaymentMethod, label: "Card", icon: CreditCard },
                  { id: "upi" as PaymentMethod, label: "UPI", icon: Smartphone },
                  { id: "cash" as PaymentMethod, label: "Cash", icon: Banknote },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all group cursor-pointer ${
                      paymentMethod === method.id
                        ? "border-blue-600 bg-blue-50/20 shadow-inner"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <method.icon
                      className={`w-6 h-6 transition-all ${
                        paymentMethod === method.id ? "text-blue-600 scale-110" : "text-slate-400 group-hover:text-slate-650"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider ${
                        paymentMethod === method.id ? "text-blue-700" : "text-slate-500"
                      }`}
                    >
                      {method.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-Specific Payment Panels */}
            <div className="min-h-[170px] flex flex-col justify-center bg-slate-50/50 p-4 sm:p-6 rounded-[2rem] border border-slate-100">
              <AnimatePresence mode="wait">
                
                {/* CREDIT/DEBIT CARD OPTION */}
                {paymentMethod === "card" && (
                  <motion.div
                    key="card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 w-full"
                  >
                    {/* Interactive 3D Card Preview */}
                    <div className="relative w-full h-40 sm:h-44 mx-auto mb-4 [perspective:1000px] select-none">
                      <motion.div 
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.55 }}
                        className="w-full h-full relative [transform-style:preserve-3d]"
                      >
                        {/* Front Face */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg border border-white/10 [backface-visibility:hidden]">
                          <div className="flex justify-between items-start">
                            <div className="w-9 h-6 bg-amber-400/90 rounded-md shadow-inner flex items-center justify-center">
                               <div className="w-1/3 h-full border-r border-black/10" />
                               <div className="w-1/3 h-full border-r border-black/10" />
                            </div>
                            <span className="text-[10px] font-black italic tracking-widest text-slate-400 uppercase">RoadHelp Pay</span>
                          </div>
                          <div className="space-y-3">
                            <p className="text-base sm:text-lg font-mono tracking-widest text-center">
                              {cardNumber.padEnd(16, '•').replace(/(.{4})/g, '$1 ')}
                            </p>
                            <div className="flex justify-between items-end">
                              <div className="min-w-0 flex-1 pr-4">
                                <p className="text-[7px] uppercase tracking-wider text-slate-500 font-bold">Holder Name</p>
                                <p className="text-[11px] font-bold uppercase tracking-wider truncate">
                                  {cardName || 'Your Name'}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[7px] uppercase tracking-wider text-slate-500 font-bold">Expiry</p>
                                <p className="text-[11px] font-mono font-bold">{cardExpiry || 'MM/YY'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Back Face (Flipped) */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg border border-white/10 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <div className="w-full h-8 bg-slate-800 -mx-5 mt-2 shrink-0" />
                          <div className="space-y-3">
                            <div className="flex justify-end items-center gap-2">
                              <span className="text-[7px] uppercase text-slate-400 font-bold">CVV</span>
                              <div className="bg-white text-slate-950 font-mono px-2.5 py-1.5 rounded font-black text-right text-xs w-12">
                                {cardCvv || '•••'}
                              </div>
                            </div>
                            <p className="text-[8px] text-slate-500 font-semibold leading-relaxed">
                              This simulated gateway supports VISA, MasterCard, and RuPay breakdown processing.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3">
                      <Input
                        placeholder="Cardholder Full Name"
                        value={cardName}
                        onChange={(e) => {
                          setCardName(e.target.value);
                          setNameError(false);
                        }}
                        onFocus={() => setIsFlipped(false)}
                        className={`rounded-xl bg-white h-11 text-xs font-bold transition-all ${
                          nameError ? 'border-red-500 ring-2 ring-red-100 bg-red-50' : 'border-slate-100'
                        }`}
                      />
                      <Input
                        placeholder="Card Number (16-digits)"
                        type="text"
                        maxLength={16}
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onFocus={() => setIsFlipped(false)}
                        className={`rounded-xl bg-white h-11 text-xs font-bold transition-all ${
                          cardError ? 'border-red-500 ring-2 ring-red-100 bg-red-50' : 'border-slate-100'
                        }`}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={handleCardExpiryChange}
                          onFocus={() => setIsFlipped(false)}
                          className={`rounded-xl bg-white h-11 text-xs font-bold text-center transition-all ${
                            expiryError ? 'border-red-500 ring-2 ring-red-100 bg-red-50' : 'border-slate-100'
                          }`}
                        />
                        <Input
                          placeholder="CVV"
                          maxLength={3}
                          type="password"
                          value={cardCvv}
                          onChange={handleCardCvvChange}
                          onFocus={() => setIsFlipped(true)}
                          onBlur={() => setIsFlipped(false)}
                          className={`rounded-xl bg-white h-11 text-xs font-bold text-center transition-all ${
                            cvvError ? 'border-red-500 ring-2 ring-red-100 bg-red-50' : 'border-slate-100'
                          }`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* UPI PAYMENTS OPTION */}
                {paymentMethod === "upi" && (
                  <motion.div
                    key="upi"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 w-full"
                  >
                    {/* Mock QR scan code block */}
                    <div className="flex items-center justify-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="p-2.5 bg-slate-900 rounded-xl shadow-inner text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white">
                          <rect x="2" y="2" width="6" height="6" rx="1" />
                          <rect x="16" y="2" width="6" height="6" rx="1" />
                          <rect x="2" y="16" width="6" height="6" rx="1" />
                          <rect x="9" y="9" width="6" height="6" rx="1" />
                          <path d="M9 2h2m0 4h2M9 16h2m5-3v5m-3 0h3M5 9v2M2 13h4M13 16h2" />
                        </svg>
                      </div>
                      <div className="text-left space-y-0.5">
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Instant UPI Scanner</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                          Scan using GPay, PhonePe, or Paytm on your secondary device to process this checkout instantly.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <Input
                        placeholder="UPI Virtual Address (e.g. name@upi)"
                        value={upiId}
                        onChange={(e) => {
                          setUpiId(e.target.value);
                          setUpiError(false);
                        }}
                        className={`rounded-xl bg-white h-12 text-xs font-bold px-4 transition-all ${
                          upiError ? 'border-red-500 ring-2 ring-red-100 bg-red-50' : 'border-slate-100'
                        }`}
                      />
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 ml-1 uppercase tracking-wider">
                        Approval prompt will trigger on your linked mobile device
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* CASH METHOD */}
                {paymentMethod === "cash" && (
                  <motion.div
                    key="cash"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 w-full"
                  >
                    <div className="bg-emerald-50/80 border border-emerald-100 p-5 rounded-2xl text-center space-y-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-[0.2em] mb-1">
                          Required Cash Handover
                        </p>
                        <p className="text-2xl font-black text-emerald-950 tracking-tighter">
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                      cashConfirmedError ? 'border-red-400 bg-red-50/50' : 'border-slate-100 bg-white'
                    }`}>
                      <Checkbox
                        id="confirmCash"
                        checked={cashConfirmed}
                        onCheckedChange={(c) => {
                          setCashConfirmed(c === true);
                          setCashConfirmedError(false);
                        }}
                        className="mt-0.5 border-slate-350"
                      />
                      <Label htmlFor="confirmCash" className="text-[10px] font-bold text-slate-650 leading-relaxed cursor-pointer select-none">
                        I confirm that the service helper has finalized all repairs and I have handed over the total cash amount directly to them.
                      </Label>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Payout Completion Button */}
            <Button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full mb-10 bg-slate-900 hover:bg-blue-600 text-white h-14 sm:h-16 rounded-2xl font-black shadow-xl hover:shadow-blue-500/10 cursor-pointer transform active:scale-[0.98] transition-all"
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
                  <span className="uppercase tracking-widest text-xs">Verifying Transaction...</span>
                </span>
              ) : (
                <span className=" flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                  Authorize payment • {formatCurrency(totalAmount)}
                  <Zap className="w-3.5 h-3.5 fill-white text-white" />
                </span>
              )}
            </Button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
