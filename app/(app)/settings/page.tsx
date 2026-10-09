"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DEMO_PATIENT } from "@/lib/demo/data";
import { User, Phone, ShieldCheck, Sparkles, Save } from "lucide-react";

export default function SettingsPage() {
  const patient = DEMO_PATIENT;
  const [name, setName] = useState(patient.display_name);
  const [bloodGroup, setBloodGroup] = useState(patient.blood_group);
  const [contactName, setContactName] = useState(patient.emergency_contact.name);
  const [contactPhone, setContactPhone] = useState(patient.emergency_contact.phone);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Patient Profile & Configurations"
        subtitle="Manage identity attributes, emergency delegates, and system connections"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Identity Info */}
          <Card className="bg-card/70 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Display Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Date of Birth</Label>
                  <Input
                    type="date"
                    defaultValue={patient.date_of_birth}
                    className="text-xs h-9"
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Blood Group</Label>
                  <Input
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Delegate */}
          <Card className="bg-card/70 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-health-rose" />
                Emergency Contact Delegate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Contact Full Name</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Emergency Phone</Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Extraction Provider Status */}
          <Card className="bg-card/70 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI & OCR Engine Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <span>Active Vision Model</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Google Gemini 2.0 Flash
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <span>Local OCR Layer</span>
                <Badge variant="outline" className="bg-health-emerald/10 text-health-emerald border-health-emerald/30">
                  PaddleOCR (Enabled)
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <span>Database Connectivity</span>
                <Badge variant="outline" className="bg-health-emerald/10 text-health-emerald border-health-emerald/30">
                  Supabase Connected
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            {saved && (
              <span className="text-xs font-semibold text-health-emerald">
                ✓ Preferences updated successfully
              </span>
            )}
            <Button
              type="submit"
              className="ml-auto bg-gradient-to-r from-primary to-health-emerald text-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
