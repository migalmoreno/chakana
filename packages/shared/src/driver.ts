export interface ActionResult {
  success: boolean;
  message: string;
}

export interface GeoActionDriver {
  id: string;
  name: string;
  description: string;
  executeAction: (relay: {
    hostname: string;
    countryCode: string;
    countryName: string;
  }) => Promise<ActionResult>;
  disconnect?: () => Promise<ActionResult>;
  currentPeer?: () => Promise<string | null>;
}
