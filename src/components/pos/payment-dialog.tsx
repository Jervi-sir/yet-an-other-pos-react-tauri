import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (method: string, amount: number) => void;
}

export function PaymentDialog({ open, onOpenChange, totalAmount, onConfirm }: PaymentDialogProps) {
  const [method, setMethod] = useState("cash");
  const [tendered, setTendered] = useState(totalAmount.toString());

  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - totalAmount;

  const handlePay = () => {
    onConfirm(method, tenderedNum);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total to Pay</div>
            <div className="text-3xl font-bold">{Math.round(totalAmount)} da</div>
          </div>

          <div className="grid gap-2">
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              <Button
                variant={method === 'cash' ? 'default' : 'outline'}
                onClick={() => setMethod('cash')}
                className="flex-1"
              >
                Cash
              </Button>
              <Button
                variant={method === 'card' ? 'default' : 'outline'}
                onClick={() => setMethod('card')}
                className="flex-1"
              >
                Card
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tendered">Amount Tendered</Label>
            <Input
              id="tendered"
              type="number"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              step="1"
              autoFocus
            />
          </div>

          {method === 'cash' && (
            <div className="flex justify-between items-center bg-muted p-2 rounded">
              <span className="font-medium">Change Due:</span>
              <span className={`font-bold ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
                {Math.round(change)} da
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePay} disabled={tenderedNum < totalAmount && method === 'cash'}>
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
