import { BasePlatform } from "./BasePlatform.js";
import SnitchPlatform from "./Snitch.js";
import NewmePlatform from "./Newme.js";

const platformRegistry = new Map<string, BasePlatform>();

// Register platforms
platformRegistry.set("snitch.co.in", new SnitchPlatform());
platformRegistry.set("newme.asia", new NewmePlatform());

export function getPlatform(domain: string): BasePlatform | undefined {
  return platformRegistry.get(domain);
}

export function supportedPlatforms(): string[] {
  return Array.from(platformRegistry.keys());
}
