import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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

type Handler = () => void;
const warn = (message: string): Handler => {
  let called = false;

  return () => {
    if (called) {
      return;
    }

    called = true;
    console.warn(message);
  };
};

const warnMissingGA = warn('Google Analytics is not loaded. Skipping.');
const warnMissingID = warn('Google Analytics Measurement ID is missing. Skipping.');

export function useTracking(props: UseTrackingProps) {
  const { gaMeasurementId } = props;

  const location = useLocation();

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (!window.gtag) {
      return warnMissingGA();
    }

    if (!gaMeasurementId) {
      return warnMissingID();
    }

    window.gtag('config', gaMeasurementId, {
      page_path: location.pathname,
    });
  }, [location]);
}
