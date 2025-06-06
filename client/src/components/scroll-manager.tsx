import { useScrollToTop } from '@/hooks/use-scroll-management';

interface ScrollManagerProps {
  children: React.ReactNode;
}

export const ScrollManager: React.FC<ScrollManagerProps> = ({ children }) => {
  useScrollToTop();
  
  return <>{children}</>;
};