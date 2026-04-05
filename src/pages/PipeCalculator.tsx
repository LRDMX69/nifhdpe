import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Droplets, Gauge, Ruler } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGsapFadeUp, useGsapStagger } from "@/hooks/useGsapAnimation";

const pipeSpecs = {
  hdpe: [
    { diameter: 63, sdr: 11, thickness: 5.8, pressure: 16, weightPerM: 1.06 },
    { diameter: 75, sdr: 11, thickness: 6.8, pressure: 16, weightPerM: 1.46 },
    { diameter: 90, sdr: 11, thickness: 8.2, pressure: 16, weightPerM: 2.12 },
    { diameter: 110, sdr: 11, thickness: 10.0, pressure: 16, weightPerM: 3.14 },
    { diameter: 125, sdr: 11, thickness: 11.4, pressure: 16, weightPerM: 4.08 },
    { diameter: 160, sdr: 11, thickness: 14.6, pressure: 16, weightPerM: 6.67 },
    { diameter: 200, sdr: 11, thickness: 18.2, pressure: 16, weightPerM: 10.4 },
    { diameter: 250, sdr: 11, thickness: 22.7, pressure: 16, weightPerM: 16.2 },
    { diameter: 315, sdr: 11, thickness: 28.6, pressure: 16, weightPerM: 25.7 },
  ],
  pvc: [
    { diameter: 63, sdr: 0, thickness: 3.0, pressure: 10, weightPerM: 0.56 },
    { diameter: 75, sdr: 0, thickness: 3.6, pressure: 10, weightPerM: 0.80 },
    { diameter: 90, sdr: 0, thickness: 4.3, pressure: 10, weightPerM: 1.15 },
    { diameter: 110, sdr: 0, thickness: 5.3, pressure: 10, weightPerM: 1.72 },
    { diameter: 160, sdr: 0, thickness: 7.7, pressure: 10, weightPerM: 3.62 },
    { diameter: 200, sdr: 0, thickness: 9.6, pressure: 10, weightPerM: 5.65 },
    { diameter: 250, sdr: 0, thickness: 11.9, pressure: 10, weightPerM: 8.79 },
    { diameter: 315, sdr: 0, thickness: 15.0, pressure: 10, weightPerM: 13.98 },
  ],
};

const PipeCalculator = () => {
  const [pipeType, setPipeType] = useState("hdpe");
  const [diameter, setDiameter] = useState(110);
  const [length, setLength] = useState(100);
  const [flowRate, setFlowRate] = useState(5);
  const [calculated, setCalculated] = useState(false);
  const resultRef = useGsapFadeUp(0.2);
  const tableRef = useGsapStagger(".gsap-card", 0.03);

  const specs = pipeSpecs[pipeType as keyof typeof pipeSpecs];
  const selected = specs.find((s) => s.diameter === diameter);

  // Simplified Hazen-Williams
  const innerDiameter = selected ? (selected.diameter - 2 * selected.thickness) / 1000 : 0;
  const velocity = innerDiameter > 0 ? (flowRate / 1000) / (Math.PI * (innerDiameter / 2) ** 2) : 0;
  const C = pipeType === "hdpe" ? 150 : 140;
  const headLoss = innerDiameter > 0 ? (10.67 * (flowRate / 1000) ** 1.852) / (C ** 1.852 * innerDiameter ** 4.87) * length : 0;
  const totalWeight = selected ? selected.weightPerM * length : 0;

  const handleCalculate = () => setCalculated(true);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Pipe Calculator" description="Engineering calculations for pipe sizing" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pipe Type</Label>
              <Select value={pipeType} onValueChange={(v) => { setPipeType(v); setCalculated(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="hdpe">HDPE</SelectItem><SelectItem value="pvc">PVC</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Diameter (mm)</Label>
              <Select value={diameter.toString()} onValueChange={(v) => { setDiameter(Number(v)); setCalculated(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{specs.map((s) => <SelectItem key={s.diameter} value={s.diameter.toString()}>{s.diameter}mm</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Length (meters)</Label>
              <Input type="number" value={length} onChange={(e) => { setLength(Number(e.target.value)); setCalculated(false); }} />
            </div>
            <div className="space-y-2">
              <Label>Flow Rate (L/s)</Label>
              <Input type="number" value={flowRate} onChange={(e) => { setFlowRate(Number(e.target.value)); setCalculated(false); }} step="0.1" />
            </div>
            <Button className="w-full" onClick={handleCalculate}>Calculate</Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {calculated && selected && (
            <div ref={resultRef} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-border/50"><CardContent className="pt-4 pb-3 text-center">
                <Gauge className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs text-muted-foreground">Pressure Rating</p>
                <p className="text-xl font-bold">{selected.pressure} bar</p>
              </CardContent></Card>
              <Card className="border-border/50"><CardContent className="pt-4 pb-3 text-center">
                <Droplets className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs text-muted-foreground">Flow Velocity</p>
                <p className="text-xl font-bold">{velocity.toFixed(2)} m/s</p>
              </CardContent></Card>
              <Card className="border-border/50"><CardContent className="pt-4 pb-3 text-center">
                <Ruler className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs text-muted-foreground">Head Loss</p>
                <p className="text-xl font-bold">{headLoss.toFixed(2)} m</p>
              </CardContent></Card>
              <Card className="border-border/50"><CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mt-5">Total Weight</p>
                <p className="text-xl font-bold">{totalWeight.toFixed(0)} kg</p>
              </CardContent></Card>
            </div>
          )}

          {/* Reference table */}
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{pipeType.toUpperCase()} Specifications</CardTitle></CardHeader>
            <CardContent>
              <div ref={tableRef} className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left">
                      <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Diameter</th>
                      <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Thickness</th>
                      <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Pressure</th>
                      <th className="py-2 text-xs text-muted-foreground font-medium">Weight/m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specs.map((s) => (
                      <tr key={s.diameter} className={`gsap-card border-b border-border/30 ${s.diameter === diameter ? "bg-primary/5" : ""}`}>
                        <td className="py-2 pr-4 font-medium">{s.diameter}mm {s.diameter === diameter && <Badge variant="default" className="ml-1 text-xs">Selected</Badge>}</td>
                        <td className="py-2 pr-4">{s.thickness}mm</td>
                        <td className="py-2 pr-4">{s.pressure} bar</td>
                        <td className="py-2">{s.weightPerM} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PipeCalculator;
