import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

// eslint-disable-next-line camelcase
type GTag = (key: string, measurementId: string, config: { page_path: string }) => void;

declare global {
  interface Window {
    gtag?: GTag;
  }
}

export type UseTrackingProps = {
  gaMeasurementId?: string;
}
export function useTracking(props: UseTrackingProps) {
  const { gaMeasurementId } = props;
  const { listen } = useHistory();

  useEffect(() => {
    const removeListener = listen((location) => {
      if (!window.gtag) {
        console.log('Google Analytics is not loaded. Skipping.');
        return;
      }

      if (!gaMeasurementId) {
        console.log('Missing Google Analytics Measurement ID');
        return;
      }

      window.gtag('config', gaMeasurementId, {
        page_path: location.pathname,
      });
    });

    return removeListener;
  }, [gaMeasurementId, listen]);
}
