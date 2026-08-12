import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--popover)",
          "--success-text": "#ffffff",
          "--success-border": "var(--border)",
          "--error-bg": "var(--popover)",
          "--error-text": "#ffffff",
          "--error-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          description: "!text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
