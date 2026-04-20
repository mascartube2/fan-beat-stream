import logoIcon from "@/assets/logo-icon.png";
import logoFull from "@/assets/logo-full.png";

export function LogoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src={logoIcon}
      alt="Mascartube"
      width={64}
      height={64}
      className={className}
    />
  );
}

export function LogoFull({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src={logoFull}
      alt="Mascartube"
      width={208}
      height={64}
      className={className}
    />
  );
}
