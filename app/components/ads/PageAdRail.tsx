import { AdSlot } from './AdSlot';

interface PageAdRailProps {
  children: React.ReactNode;
}

export function PageAdRail({ children }: PageAdRailProps) {
  return (
    <div className="page-ad-rail">
      <AdSlot variant="sidebarLeft" />
      <div className="page-ad-rail__content">{children}</div>
      <AdSlot variant="sidebarRight" />
    </div>
  );
}
