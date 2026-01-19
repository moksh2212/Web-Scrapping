import { Platform } from "./base";
import { MediaMarkt } from "./mediamarkt";
import { Marktplaats } from "./marktplaats";
import { Asos } from "./asos";

export class PlatformFactory {
  private static platforms: Map<string, new () => Platform> = new Map([
    ["marktplaats", Marktplaats],
    ["mediamarkt", MediaMarkt],
    ["asos", Asos],
  ]);


  static getPlatform(platformName: string): Platform {
    const normalizedName = platformName.toLowerCase().trim();
    const PlatformClass = this.platforms.get(normalizedName);

    if (!PlatformClass) {
      const availablePlatforms = Array.from(this.platforms.keys()).join(", ");
      throw new Error(
        `Platform "${platformName}" not found. Available platforms: ${availablePlatforms}`
      );
    }

    return new PlatformClass();
  }


  static getAvailablePlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }

  static registerPlatform(name: string, platformClass: new () => Platform): void {
    this.platforms.set(name.toLowerCase().trim(), platformClass);
  }
}