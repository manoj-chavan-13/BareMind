import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetryService } from '@/services/telemetryService';

export function useAutoTracker() {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    telemetryService.track('page_view', {
      search: location.search,
      hash: location.hash
    });
  }, [location.pathname, location.search, location.hash]);

  // Track global clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // We look for elements that either have data-track attribute, or are interactive (buttons/links)
      const trackableElement = target.closest('[data-track]') || target.closest('button') || target.closest('a');
      
      if (trackableElement) {
        const elementType = trackableElement.tagName.toLowerCase();
        
        let trackData: Record<string, string> = {
          element: elementType
        };

        // If it's explicitly tracked via data-track, use that name
        const trackName = trackableElement.getAttribute('data-track');
        if (trackName) {
          trackData.name = trackName;
        }

        // Add contextual info
        if (elementType === 'a') {
          trackData.href = (trackableElement as HTMLAnchorElement).href;
        } else if (elementType === 'button') {
          const text = trackableElement.textContent?.trim();
          if (text) trackData.text = text.substring(0, 50); // limit length
        }

        telemetryService.track('click', trackData);
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);
}
