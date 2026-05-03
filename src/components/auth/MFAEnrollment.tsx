import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export const MFAEnrollment = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState<"intro" | "qr" | "verify">("intro");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "NIF Technical ERP",
        friendlyName: "ERP Authenticator"
      });
      
      if (error) throw error;
      
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setStep("qr");
    } catch (error: any) {
      toast({ title: "Enrollment failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verifyFactor = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode
      });
      
      if (error) throw error;
      
      toast({ title: "MFA Enabled", description: "Your account is now protected with 2FA." });
      onComplete();
    } catch (error: any) {
      toast({ title: "Verification failed", description: "Invalid code. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Security Requirement</CardTitle>
        </div>
        <CardDescription>
          Administrator and Finance roles require Multi-Factor Authentication (MFA) to access the ERP.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "intro" && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Smartphone className="h-4 w-4" />
                <span>Authenticator App</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You'll need an app like Google Authenticator or Microsoft Authenticator to scan a QR code.
              </p>
            </div>
            <Button className="w-full" onClick={startEnrollment} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Enrollment
            </Button>
          </div>
        )}

        {step === "qr" && (
          <div className="space-y-6 text-center">
            <div className="bg-white p-4 rounded-lg inline-block border border-border">
              <QRCodeSVG value={qrCode} size={200} />
            </div>
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app, then click continue.
            </p>
            <Button className="w-full" onClick={() => setStep("verify")}>Continue</Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <Button className="w-full" onClick={verifyFactor} disabled={loading || verifyCode.length !== 6}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify & Enable
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep("qr")}>Back to QR Code</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
