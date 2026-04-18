import {
  SiApple,
  SiSamsung,
  SiXiaomi,
  SiOppo,
  SiVivo,
  SiHuawei,
  SiOneplus,
  SiGoogle,
  SiSony,
  SiNokia,
  SiMotorola,
  SiAsus,
  SiLenovo,
  SiLg,
  SiHonor,
} from "react-icons/si";
import { FaMobileAlt } from "react-icons/fa";
import { MdSmartphone } from "react-icons/md";
import type { ReactNode } from "react";

/**
 * Brand icon mapping - maps brand names to their corresponding icons
 */
export const brandIconMap: Record<string, ReactNode> = {
  apple: <SiApple className="h-4 w-4" />,
  iphone: <SiApple className="h-4 w-4" />,
  samsung: <SiSamsung className="h-4 w-4" />,
  xiaomi: <SiXiaomi className="h-4 w-4" />,
  oppo: <SiOppo className="h-4 w-4" />,
  vivo: <SiVivo className="h-4 w-4" />,
  realme: <FaMobileAlt className="h-4 w-4" />,
  huawei: <SiHuawei className="h-4 w-4" />,
  oneplus: <SiOneplus className="h-4 w-4" />,
  google: <SiGoogle className="h-4 w-4" />,
  sony: <SiSony className="h-4 w-4" />,
  nokia: <SiNokia className="h-4 w-4" />,
  motorola: <SiMotorola className="h-4 w-4" />,
  asus: <SiAsus className="h-4 w-4" />,
  lenovo: <SiLenovo className="h-4 w-4" />,
  lg: <SiLg className="h-4 w-4" />,
  honor: <SiHonor className="h-4 w-4" />,
  zte: <FaMobileAlt className="h-4 w-4" />,
  infinix: <FaMobileAlt className="h-4 w-4" />,
  tecno: <FaMobileAlt className="h-4 w-4" />,
  itel: <FaMobileAlt className="h-4 w-4" />,
};

/**
 * Get brand icon based on brand name
 * @param brandName - The brand name to get icon for
 * @returns ReactNode - The icon component for the brand, or default smartphone icon if not found
 */
export function getBrandIcon(brandName: string): ReactNode {
  const normalizedName = brandName.toLowerCase().trim();
  return brandIconMap[normalizedName] || <MdSmartphone className="h-4 w-4" />;
}
