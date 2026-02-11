import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MapPin, Wifi, Save, Navigation } from "lucide-react";

interface CampusSettingsData {
  id: string;
  campus_name: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
  campus_ip: string | null;
  campus_ip_range: string | null;
  gps_verification_enabled: boolean;
  wifi_verification_enabled: boolean;
}

export default function CampusSettingsPage() {
  const [settings, setSettings] = useState<CampusSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [campusName, setCampusName] = useState("Main Campus");
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [radius, setRadius] = useState(200);
  const [campusIp, setCampusIp] = useState("");
  const [campusIpRange, setCampusIpRange] = useState("");
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [wifiEnabled, setWifiEnabled] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('campus_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      const s = data as CampusSettingsData;
      setSettings(s);
      setCampusName(s.campus_name);
      setLatitude(s.latitude);
      setLongitude(s.longitude);
      setRadius(s.allowed_radius_meters);
      setCampusIp(s.campus_ip || "");
      setCampusIpRange(s.campus_ip_range || "");
      setGpsEnabled(s.gps_verification_enabled);
      setWifiEnabled(s.wifi_verification_enabled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('campus_settings')
        .update({
          campus_name: campusName,
          latitude,
          longitude,
          allowed_radius_meters: radius,
          campus_ip: campusIp || null,
          campus_ip_range: campusIpRange || null,
          gps_verification_enabled: gpsEnabled,
          wifi_verification_enabled: wifiEnabled,
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success("Campus settings saved successfully");
    } catch (err: any) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        toast.success("Current location captured");
      },
      (err) => {
        toast.error("Failed to get location: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campus Settings</h1>
        <p className="text-muted-foreground">Configure campus location and network for attendance verification</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* GPS Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              GPS Configuration
            </CardTitle>
            <CardDescription>Set your campus coordinates and allowed radius</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Campus Name</Label>
              <Input value={campusName} onChange={(e) => setCampusName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <Button variant="outline" onClick={getCurrentLocation} className="w-full gap-2">
              <Navigation className="h-4 w-4" />
              Use My Current Location
            </Button>
            <div className="space-y-2">
              <Label>Allowed Radius (meters)</Label>
              <Input type="number" value={radius} onChange={(e) => setRadius(parseInt(e.target.value) || 200)} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Enable GPS Verification</Label>
              <Switch checked={gpsEnabled} onCheckedChange={setGpsEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* WiFi Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-[hsl(var(--campus-info))]" />
              WiFi / Network Configuration
            </CardTitle>
            <CardDescription>Set campus IP address for network verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Campus Public IP Address</Label>
              <Input value={campusIp} onChange={(e) => setCampusIp(e.target.value)} placeholder="e.g. 203.122.45.67" />
            </div>
            <div className="space-y-2">
              <Label>IP Range Prefix (optional)</Label>
              <Input value={campusIpRange} onChange={(e) => setCampusIpRange(e.target.value)} placeholder="e.g. 203.122.45" />
              <p className="text-xs text-muted-foreground">Students with IP starting with this prefix will be allowed</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Enable WiFi Verification</Label>
              <Switch checked={wifiEnabled} onCheckedChange={setWifiEnabled} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Campus Settings"}
      </Button>
    </div>
  );
}
