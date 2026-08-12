import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Icon className="w-6 h-6 text-cyan-400" />
          {title}
        </h1>
        <p className="text-slate-400 mt-1">{description}</p>
      </div>
      {action ? <div className="w-full md:w-auto">{action}</div> : null}
    </div>
  );
}
